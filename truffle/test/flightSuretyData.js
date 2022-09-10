
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Data Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) FlighySuretyData has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });



  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) can register an Airline using registerAirline()', async () => {
    
    // ARRANGE
    let result;
    let newAirline = accounts[2];

    // ACT
    try {
        result = await config.flightSuretyData.registerAirline(newAirline, {from: config.firstAirline});
      }
    catch(e) {

    }
    let isRegisteredResult = await config.flightSuretyData.isAirline.call(newAirline); 
    // ASSERT
    assert.equal(isRegisteredResult, true, "Airline should be able to register another airline");
    assert.equal(result.logs[0].event, "AirlineWasRegistered", "Event funded has not been emitted");
  });

  it('() can fund FlightSuretyData contract using fund()', async () => {
    
    // ARRANGE
    let result;
    let newAirline = accounts[3];
    let AIRLINE_REGISTRATION_FEE = web3.utils.toWei("10", "ether");
    await config.flightSuretyData.registerAirline(newAirline, {from: config.firstAirline}); 
    // ACT
    let contractBalanceBefore = await config.flightSuretyData.getContractBalance.call();

    try {
        result = await config.flightSuretyData.fund(newAirline, AIRLINE_REGISTRATION_FEE, {from: newAirline});
      }
    catch(e) {
      console.log(e)
    }

    let contractBalanceAfter = await config.flightSuretyData.getContractBalance.call(); 
    // ASSERT
    assert.equal(contractBalanceAfter-contractBalanceBefore, AIRLINE_REGISTRATION_FEE, "Airline funds have not been collected")
    assert.equal(result.logs[0].event, "funded", "Event funded has not been emitted");
  });

  it('(airline) can fund their registration using submitFundsAirline', async () => {
    
    // ARRANGE
    let result;
    let newAirline = accounts[2];
    let AIRLINE_REGISTRATION_FEE = web3.utils.toWei("10", "ether");
    // ACT
    let contractBalanceBefore = await config.flightSuretyData.getContractBalance.call();
    try {
        result = await config.flightSuretyData.submitFundsAirline(newAirline, AIRLINE_REGISTRATION_FEE, {from: newAirline});
    }
    catch(e) {

    }
    let contractBalanceAfter = await config.flightSuretyData.getContractBalance.call();

    let isFundedResult = await config.flightSuretyData.isFundedAirline.call(newAirline); 
    let activeAirlineResult = await config.flightSuretyData.whatAirlines.call();

    // ASSERT
    assert.equal(isFundedResult, true, "Airline has not been marked as funded");
    assert.equal(contractBalanceAfter-contractBalanceBefore, AIRLINE_REGISTRATION_FEE, "Airline funds have not been collected")
    assert.equal(result.logs[1].event, "AirlineWasFunded", "Event funded has not been emitted");
    assert.equal(activeAirlineResult[0], newAirline, "Airline has not been added to activeAirlines[]")
  });
 
  it('(airline) can register a flight using registerFlight()', async () => {
    
    // ARRANGE
    let result;
    let airline = accounts[2];
    let flight = web3.utils.asciiToHex('ND1309'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    // ACT
    try {
        result = await config.flightSuretyData.registerFlight(flight, timestamp , 0, airline);
      }
    catch(e) {

    }
    let isRegisterResult = await config.flightSuretyData.isFlight.call(flight, timestamp, airline); 
    let hasStatusResult = await config.flightSuretyData.viewFlightSatus.call(flight, airline, timestamp);
    let whatFlightResult = await config.flightSuretyData.whatFlight(airline); 
    // ASSERT
    assert.equal(isRegisterResult, true, "Airline should be able to register a flight");
    assert.equal(hasStatusResult, 0, "Just registered airline should have a '0' status");
    assert.equal(result.logs[0].event, "FlightWasRegistered", "Event funded has not been emitted");
    assert.equal(whatFlightResult[0].substring(0,14), flight, "Flight has not been registered in airline's mapping");
  });


  it('(passenger) can buy an insurance using buyInsurance', async () => {
    
    // ARRANGE
    let result;
    let passenger = accounts[11];
    let flight = web3.utils.asciiToHex('ND1309'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    let airline = accounts[3];
    let INSURANCE_PRICE = web3.utils.toWei("1", "ether");

    await config.flightSuretyData.registerFlight(flight, timestamp , 0, airline);

    // ACT
    let contractBalanceBefore = await config.flightSuretyData.getContractBalance.call();
    try {
        result = await config.flightSuretyData.buyInsurance(flight, timestamp, airline, passenger, INSURANCE_PRICE);
      }
    catch(e) {

    }
    let contractBalanceAfter = await config.flightSuretyData.getContractBalance.call();

    let isInsuranceBought = await config.flightSuretyData.isInsured.call(flight, timestamp, airline, passenger, INSURANCE_PRICE); 

    // ASSERT
    assert.equal(isInsuranceBought, true, "Insurance has not been bought");
    assert.equal(contractBalanceAfter-contractBalanceBefore, INSURANCE_PRICE, "Airline funds have not been collected")
    assert.equal(result.logs[1].event, "newInsurance", "Event newInsurance has not been emitted");
  });

  it('() update status code and add insurance amount to passengers balance if fligth has been delayed using creditInsurance', async () => {
    
    // ARRANGE
    let result;
    let passenger = accounts[11];
    let flight = web3.utils.asciiToHex('ND1309'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    let airline = accounts[3];
    let INSURANCE_PRICE = web3.utils.toWei("1", "ether");

    await config.flightSuretyData.registerFlight(flight, timestamp , 0, airline);
    await config.flightSuretyData.buyInsurance(flight, timestamp, airline, passenger, INSURANCE_PRICE);
    // ACT
    let contractBalanceBefore = await config.flightSuretyData.getContractBalance.call();

    try {
        result = await config.flightSuretyData.creditInsurees(airline, flight, timestamp, 50);
      }
    catch(e) {
      console.log(e)
    }
    let contractBalanceAfter = await config.flightSuretyData.getContractBalance.call();
    let isFlightSatusUpdated = await config.flightSuretyData.viewFlightSatus.call(flight, airline, timestamp); 

    // ASSERT
    assert.equal(isFlightSatusUpdated, 50, "Flight status has not been updated");
    assert.equal(contractBalanceBefore - contractBalanceAfter,  1500000000000000000, "Solde has not changed");
    assert.equal(result.logs[0].event, "statusCodeUpddated", "Event statusCodeUpddated has not been emitted");
    assert.equal(result.logs[1].event, "passengerCredited", "Event passengerCredited has not been emitted");
  });

  it('() transfer money to passenger account using withdraw()', async () => {
    
    // ARRANGE
    let result;
    let passenger = accounts[11];
    let flight = web3.utils.asciiToHex('ND1309'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    let airline = accounts[3];
    let INSURANCE_PRICE = web3.utils.toWei("1", "ether");

    await config.flightSuretyData.registerFlight(flight, timestamp , 0, airline);
    await config.flightSuretyData.buyInsurance(flight, timestamp, airline, passenger, INSURANCE_PRICE);
    await config.flightSuretyData.creditInsurees(airline, flight, timestamp, 50);

    let balancePassengerBefore = await web3.eth.getBalance(passenger);
    console.log(balancePassengerBefore)
    // ACT

    try {
        result = await config.flightSuretyData.withdraw(passenger, INSURANCE_PRICE);
      }
    catch(e) {
      console.log(e)
    }

    let balancePassengerAfter = await web3.eth.getBalance(passenger);
    console.log(balancePassengerAfter)
    // ASSERT
    // assert.equal(balancePassengerAfter - balancePassengerBefore,  1500000000000000000, "Balance has not changed");
    assert.equal(result.logs[0].event, "accountTransfer", "Event passengerAccountTransfer has not been emitted");
  });

});
