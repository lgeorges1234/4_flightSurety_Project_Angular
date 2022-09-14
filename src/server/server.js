const FlightSuretyApp = require('../../truffle/build/contracts/FlightSuretyApp.json') 
const Config = require('../assets/server/config.json');
const Web3 = require('web3');
const express = require('express');


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);


const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const STATUS_CODE = [0,10, 20, 30, 40, 50]

const REGISTRATION_FEES = web3.utils.toWei("10", "ether");
let accounts;

const init = async () => {
  accounts = await web3.eth.getAccounts();
  for(let a=29; a<50; a++){
    try {
      registerOracleResult = await flightSuretyApp.methods
          .registerOracle()
          .send({
            "from": accounts[a],   
            "value": REGISTRATION_FEES,
            "gas": 4712388,
            "gasPrice": 100000000000
          })
      let result = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[a]});
      console.log(`${a}: Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`)
    } catch(e) {   
      console.log(e.message)   
    }
  }
}

init();


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, async function (error, event) {
    if (error) console.log(error)
    // console.log(event)
    let submitOracleResponseResult;

    let index = event.returnValues.index;
    let airline = event.returnValues.airline;
    let flight = event.returnValues.flight;
    let timestamp = event.returnValues.timestamp;
    const random = STATUS_CODE[Math.floor(Math.random() * STATUS_CODE.length)];
    console.log(`random : ${random}`)
    // console.log(`index from request : ${index}`)
    for(let a=29; a<50; a++){
      let oracleIndexesResult = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[a]});
      // console.log(`Oracle's index : ${oracleIndexesResult}`)
      for(let i=0; i<3; i++) {

        if(oracleIndexesResult[i] == index) {
          try {
            submitOracleResponseResult = await flightSuretyApp.methods
            .submitOracleResponse(oracleIndexesResult[i], airline, flight, timestamp, random)
            .send({
              "from": accounts[a],   
              "gas": 4712388,
              "gasPrice": 100000000000
            })
            
          } catch (e) {
            console.log(e.message)
          }
        }
      }
    }
    if(submitOracleResponseResult) console.log(submitOracleResponseResult)
});





const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

module.exports = {
  app
}

// export default app;


