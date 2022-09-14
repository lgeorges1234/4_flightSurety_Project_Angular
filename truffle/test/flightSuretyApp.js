
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety App Tests ', async (accounts) => {

  let AIRLINE_REGISTRATION_FEE = web3.utils.toWei("10", "ether");
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/


  it(`(multiparty) FlighySuretyApp can get isOperational() value from FlightSuretyData`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    let dataStatus = await config.flightSuretyData.isOperational.call();
    assert.equal(status, dataStatus, "Incorrect initial operating status value");
  });

  // it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

  //     // Ensure that access is denied for non-Contract Owner account
  //     let accessDenied = false;
  //     try 
  //     {
  //         await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
  //     }
  //     catch(e) {
  //         accessDenied = true;
  //     }
  //     assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  // });

  // it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

  //     // Ensure that access is allowed for Contract Owner account
  //     let accessDenied = false;
  //     try 
  //     {
  //         await config.flightSuretyData.setOperatingStatus(false);
  //     }
  //     catch(e) {
  //         accessDenied = true;
  //     }
  //     assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  // });

  // it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

  //     await config.flightSuretyData.setOperatingStatus(false);

  //     let reverted = false;
  //     try 
  //     {
  //         await config.flightSurety.setTestingMode(true);
  //     }
  //     catch(e) {
  //         reverted = true;
  //     }
  //     assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

  //     // Set it back for other tests to work
  //     await config.flightSuretyData.setOperatingStatus(true);

  // });

  it('(contractOwner) can register the first Airline using registerAirline()', async () => {
    
    // ARRANGE
    let registerFirstAirlineResult;
    // ACT
    try {
      registerFirstAirlineResult = await config.flightSuretyApp.registerFirstAirline(config.firstAirline, {from: config.owner});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(config.firstAirline);
    // ASSERT
    assert.equal(result, true, "ContractOwner should be able to register the first airline");
    assert.equal(registerFirstAirlineResult.logs[0].event , "AirlineWasRegistered", "Event AirlineWasRegistered was not emitted");
  });


  it('(airline) can fund the firstAirline using submitFundsAirline()', async () => {

    
    // ARRANGE
    let submitFundsResult;
    let contractBalanceBefore = await config.flightSuretyData.getContractBalance.call();
    // ACT
    try {
      submitFundsResult = await config.flightSuretyApp.submitFundsAirline({from: config.firstAirline, value:AIRLINE_REGISTRATION_FEE});
    }
    catch(e) {

    }

    let result = await config.flightSuretyData.isFundedAirline.call(config.firstAirline); 
    
    let contractBalanceAfter = await config.flightSuretyData.getContractBalance.call();
    // ASSERT
    assert.equal(result, true, "Airline should be able to fund the contract");
    assert.equal(contractBalanceAfter - contractBalanceBefore, AIRLINE_REGISTRATION_FEE, "Balance has not been increased from funds")
    assert.equal(submitFundsResult.logs[0].event , "AirlineWasFunded", "Event AirlineWasFunded was not emitted");
  });

  it(`() FlighySuretyApp can get whatAirlines() array from FlightSuretyData`, async function () {

    // Get the registered and funded airlines
    // ARRANGE
    let whatAirlinesResult;
    // ACT
    try {
      whatAirlinesResult = await config.flightSuretyApp.getActiveAirlines.call();
    } catch(e) {
      console.log(e);
    }
    // ASSERT
    assert.equal(whatAirlinesResult[0], config.firstAirline, "First airline should be registered in the active airlines");
  });

    it('(airline) can register an Airline using registerAirline()', async () => {
    
      // ARRANGE
      let registerResult;
      let newAirline = accounts[2];
      // ACT
      try {
        registerResult = await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
        }
      catch(e) {      
      }

      let result = await config.flightSuretyData.isAirline.call(newAirline); 

      // ASSERT
      assert.equal(result, true, "Airline should be able to register another airline");
      assert.equal(registerResult.logs[0].event , "AirlineWasRegistered", "Event AirlineWasFunded was not emitted");
    });


    it('(airline) cannot register an Airline using registerAirline() if not registered', async () => {
    
      // ARRANGE
      let newAirline = accounts[3];
      let notRegisteredAirline = accounts[4];
      
      // ACT
      try {
        await config.flightSuretyApp.registerAirline(newAirline, {from:notRegisteredAirline})
      }
      catch(e) {
      }
      let result = await config.flightSuretyData.isAirline.call(newAirline); 
  
      // ASSERT
      assert.equal(result, false, "Airline should not be able to register another airline if it is not registered");
    })


  it('(airline) cannot register an Airline using registerAirline() if not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[5];
    let notFundedAirline = accounts[6];
    await config.flightSuretyApp.registerAirline(notFundedAirline, {from:config.firstAirline})

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: notFundedAirline});
    }
    catch(e) {
    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });
 
  it('(airline) cannnot register a new airline using registerAirline() if it has not a majority of votes', async () => {
    
    // ARRANGE
    // accounts[1], accounts[2], accounts[6] are already registered from previous tests
    let airlineTwo = accounts[2];
    let airlineThree = accounts[3];
    let airlineFour= accounts[6];
    let airlineHasToBeValidated = accounts[7];

    // register a fourth account - accounts[3] - that has not been registered
    await config.flightSuretyApp.registerAirline(airlineThree, {from:config.firstAirline});

    // fund each account
    await config.flightSuretyApp.submitFundsAirline({from: airlineTwo, value:AIRLINE_REGISTRATION_FEE});
    await config.flightSuretyApp.submitFundsAirline({from: airlineThree, value:AIRLINE_REGISTRATION_FEE});
    await config.flightSuretyApp.submitFundsAirline({from: airlineFour, value:AIRLINE_REGISTRATION_FEE});

    // ACT

    // register the airline with only one registered airline
    try {
      await config.flightSuretyApp.registerAirline(airlineHasToBeValidated, {from:config.firstAirline});
    }
    catch(e) {

    }

    let howManyRegisteredAirlinesResult = await config.flightSuretyData.howManyRegisteredAirlines();
    let isRegisteredResult = await config.flightSuretyData.isAirline.call(airlineHasToBeValidated); 

    // ASSERT
    assert.equal(isRegisteredResult, false, "Airline should have not been registered")
    assert.equal(howManyRegisteredAirlinesResult, 4, "Airline registered number should not be increased by one");
  });

  it('(airline) cannnot register a new airline using registerAirline() if the voter has already voted', async () => {
    
    // ARRANGE
    // accounts[1], accounts[2], accounts[6], accounts[6] are already registered and funded from previous tests
    let airlineHasToBeValidated = accounts[7];

    // initialize variables to check the revert msg
    let hasAlreadyVoted = false;
    let message;

    // ACT
    // try to register with first airline
    try {
      await config.flightSuretyApp.registerAirline(airlineHasToBeValidated, {from:config.firstAirline});
    }
    catch(e) {
      hasAlreadyVoted = true;
      message = e;
    }

    let howManyRegisteredAirlinesResult = await config.flightSuretyData.howManyRegisteredAirlines();
    let isRegisteredResult = await config.flightSuretyData.isAirline.call(airlineHasToBeValidated); 

    // ASSERT
    assert.equal(hasAlreadyVoted, true, message);
    assert.equal(isRegisteredResult, false, "Airline should have not been registered");
    assert.equal(howManyRegisteredAirlinesResult, 4, "Airline registered number should not be increased by one");
  });

  it('(airline) needs majority of votes to register a new airline using registerAirline()', async () => {
    
    // ARRANGE
    // accounts[1], accounts[2], accounts[6], accounts[6] are already registered and funded from previous tests
    let airlineTwo = accounts[2];
    let airlineHasToBeValidated = accounts[8];

    // initialize two variables to get the registerAirline result events
    let voteIncrease1;
    let voteIncrease2;

    // ACT
    try {
      voteIncrease1 = await config.flightSuretyApp.registerAirline(airlineHasToBeValidated, {from:config.firstAirline});
      voteIncrease2 = await config.flightSuretyApp.registerAirline(airlineHasToBeValidated, {from:airlineTwo});
    }
    catch(e) {
      console.log(e);
    }

    let howManyRegisteredAirlinesResult = await config.flightSuretyData.howManyRegisteredAirlines();
    let result = await config.flightSuretyData.isAirline.call(airlineHasToBeValidated); 

    // ASSERT
    assert.equal(result, true, "Airline has not obtained enough votes");
    assert.equal(howManyRegisteredAirlinesResult, 5, "Airline registered number should not be increased by one");
    assert.equal(voteIncrease1.logs[0].event , "AirlineHasOneMoreVote", "Event AirlineHasOneMoreVote was not emitted");
    assert.equal(voteIncrease2.logs[0].event , "AirlineHasOneMoreVote", "Event AirlineHasOneMoreVote was not emitted");
    assert.equal(voteIncrease2.logs[1].event , "AirlineWasRegistered", "Event AirlineWasFunded was not emitted");
  });

  it('(airline) can register a flight using registerFlight()', async () => {
    
    // ARRANGE
    let result;
    let airline = accounts[3];
    let flight = web3.utils.asciiToHex('ND1309'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    // ACT
    try {
      result = await config.flightSuretyApp.registerFlight(flight, timestamp, {from:airline})
    }
    catch(e) {
    }
    let isFlightResult = await config.flightSuretyData.isFlight.call(flight, timestamp, airline); 
    let getRegisteredFlightResult = await config.flightSuretyApp.getAirlinesFlights.call(airline);

    // ASSERT
    assert.equal(isFlightResult, true, "Flight has not been registered");
    assert.equal(result.logs[0].event, "FlightWasRegistered", "Event FlightWasRegistered has not been emitted" )
    // assert.equal(getRegisteredFlightResult[0].substring(0,14), flight, "Flight app has not been recorded in airline's mapping")
  });

  it('(passenger) cannot buy insurance using buyInsurance() if not enough funds are provided', async () => {
    
    // ARRANGE
    let notEnoughAmount = false;
    let result;
    let passenger = accounts[11];
    let flight = web3.utils.asciiToHex('ND1309'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    let airline = accounts[2];
    let INSURANCE_PRICE = web3.utils.toWei("0", "ether");
    
    await config.flightSuretyApp.registerFlight(flight, timestamp, {from:airline});

    // ACT
    try {
      result = await config.flightSuretyApp.buyInsurance(flight, timestamp, airline, {from: passenger, value: INSURANCE_PRICE} );
    }
    catch(e) {
      notEnoughAmount = true;
    }

    let isInsuranceBought = await config.flightSuretyData.isInsured.call(flight, timestamp, airline, passenger, INSURANCE_PRICE); 
    
    // ASSERT
    assert.equal(isInsuranceBought, false, "Passenger should not be able to buy an insurrance for a flight if no funds are provided");
    assert.equal(notEnoughAmount, true, "Revert should show that not enough eth was provided");
  });

  it('(passenger) cannot buy insurance using buyInsurance() if too much funds are provided', async () => {
    
    // ARRANGE
    let tooMuchAmount = false;
    let result;
    let passenger = accounts[11];
    let flight = web3.utils.asciiToHex('ND1309'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    let airline = accounts[2];
    let INSURANCE_PRICE = web3.utils.toWei("2", "ether");
    
    await config.flightSuretyApp.registerFlight(flight, timestamp, {from:airline});

    // ACT
    try {
      result = await config.flightSuretyApp.buyInsurance(flight, timestamp, airline, {from: passenger, value: INSURANCE_PRICE} );
    }
    catch(e) {
      tooMuchAmount = true;
    }

    let isInsuranceBought = await config.flightSuretyData.isInsured.call(flight, timestamp, airline, passenger, INSURANCE_PRICE); 
    
    // ASSERT
    assert.equal(isInsuranceBought, false, "Passenger should not be able to buy an insurrance for a flight if no funds are provided");
    assert.equal(tooMuchAmount, true, "Revert should show that too many eth was provided");
  });

  it('(passenger) can buy insurance using buyInsurance()', async () => {

    
    // ARRANGE
    let result;
    let passenger = accounts[11];
    let flight = web3.utils.asciiToHex('ND1308'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    let airline = accounts[2];
    let INSURANCE_PRICE = web3.utils.toWei("1", "ether");
    
    await config.flightSuretyApp.registerFlight(flight, timestamp, {from:airline});

    // ACT
    let contractBalanceBefore = await config.flightSuretyData.getContractBalance.call();

    try {
      result = await config.flightSuretyApp.buyInsurance(flight, timestamp, airline, {from: passenger, value: INSURANCE_PRICE} );
    }
    catch(e) {

    }

    let isInsuranceBought = await config.flightSuretyData.isInsured.call(flight, timestamp, airline, passenger, INSURANCE_PRICE); 
    
    let contractBalanceAfter = await config.flightSuretyData.getContractBalance.call();

    // ASSERT
    assert.equal(isInsuranceBought, true, "passenger should be able to buy an insurrance for a flight");
    assert.equal(contractBalanceAfter - contractBalanceBefore, INSURANCE_PRICE, "Balance has not been increased from funds")
    assert.equal(result.logs[0].event , "newInsuranceHasBeenSubmitted", "Event newInsuranceHasBeenSubmitted was not emitted");
  });

  it('() process fetched status code', async () => {
    
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
        result = await config.flightSuretyApp.processFlightStatus(airline, flight, timestamp, 50);
      }
    catch(e) {

    }
    let contractBalanceAfter = await config.flightSuretyData.getContractBalance.call();
    let isFlightSatusUpdated = await config.flightSuretyData.viewFlightSatusTest.call(flight, timestamp, airline); 

    // ASSERT
    assert.equal(isFlightSatusUpdated.toString(), 50, "Flight status has not been updated");
    assert.equal(contractBalanceBefore - contractBalanceAfter,  1500000000000000000, "Solde has not changed")
    assert.equal(result.logs[0].event, "flightHasBeenProcessed", "Event flightHasBeenProcessed has not been emitted");
  });

  it('(Oracle) can be registered', async () => {
    // ARRANGE
    let AIRLINE_REGISTRATION_FEE = web3.utils.toWei("10", "ether");
    // ACT
    for(let a=29; a<50; a++){
      await config.flightSuretyApp.registerOracle({from:accounts[a], value:AIRLINE_REGISTRATION_FEE});
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      // console.log(`${a}: Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`)
    }
  });

  it('(Oracle) can submit an On Time flight status', async () => {
    
    // ARRANGE
    let result;

    let airline = config.firstAirline;
    let flight = web3.utils.asciiToHex('ND1310'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);

    // Register a new flight
    await config.flightSuretyApp.registerFlight(flight, timestamp, {from:airline});
    // console.log(registerFlightResult.logs)

    // request Oracles to get status information for a flight
    let fetchFlightStatusResult = await config.flightSuretyApp.fetchFlightStatus(airline, flight, timestamp);

    for(let a=29; a<50; a++){
      let oracleIndexesResult = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      for(let i=0; i<3; i++) {

        if(oracleIndexesResult[i].toNumber() == fetchFlightStatusResult.logs[0].args.index) {
          try {
            result = await config.flightSuretyApp.submitOracleResponse(oracleIndexesResult[i], airline, flight, timestamp, 10, {from: accounts[a]});
          } catch (e) {
          }
        }
      }
    }
    assert.equal(result.logs[result.logs.length - 1].event, "flightHasBeenProcessed", "Event flightHasBeenProcessed has not been emitted");
    assert.equal(result.logs[result.logs.length - 1].args[3], 10, "Status Code has not been updated correctly");
  });

  it('(Oracle) can submit delayed flight status', async () => {
    
    // ARRANGE
    let result;

    let airline = config.firstAirline;
    let flight = web3.utils.asciiToHex('ND1311'); // Course number
    let timestamp= Math.floor(Date.now() / 1000);
    let passenger = accounts[11];
    let INSURANCE_PRICE = web3.utils.toWei("1", "ether");

    // Register a new flight
    await config.flightSuretyApp.registerFlight(flight, timestamp, {from:airline});

    // Buy insurance on the new flight
    await config.flightSuretyData.buyInsurance(flight, timestamp, airline, passenger, INSURANCE_PRICE);

    // request Oracles to get status information for a flight
    let fetchFlightStatusResult = await config.flightSuretyApp.fetchFlightStatus(airline, flight, timestamp);

    for(let a=29; a<50; a++){
      let oracleIndexesResult = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      for(let i=0; i<3; i++) {

        if(oracleIndexesResult[i].toNumber() == fetchFlightStatusResult.logs[0].args.index) {
          try {
            result = await config.flightSuretyApp.submitOracleResponse(oracleIndexesResult[i], airline, flight, timestamp, 50, {from: accounts[a]});
          } catch (e) {
          }
        }
      }
    }
    assert.equal(result.logs[result.logs.length - 1].event, "flightHasBeenProcessed", "Event flightHasBeenProcessed has not been emitted");
    assert.equal(result.logs[result.logs.length - 1].args[3], 50, "Status Code has not been updated correctly");
  });

});
