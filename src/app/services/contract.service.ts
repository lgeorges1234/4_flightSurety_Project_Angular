import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import Web3 from "web3"; 
import Config from '../../assets/app/config.json';

declare let require: any;
declare let window: any;
const tokenAbi = require('../../../truffle/build/contracts/FlightSuretyApp.json');


@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private account: any = null;
  private web3: any;
  private enable: any;

  private flightSuretyApp : any;
  private owner: any;

  airlines:any[] = [];
  listRegisteredAirlines: [] = [];
  passengers:any[] = [];


  constructor()  {

    let config = Config["localhost"];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(tokenAbi.abi, config.appAddress, config.dataAddress);
    console.log(this.flightSuretyApp);
    
  }

  async getAccount(index : number): Promise<any> {
    let self = this;
    let result;
    try {
      result = await self.web3.eth.getAccounts();
    } catch(e: any) {   
      console.log(e.message)   
    }
    return(result[index])
  }

  async isOperational(): Promise<boolean> {
    let self = this;
    let result;
    try {
    result = await self.flightSuretyApp.methods
          .isOperational()
          .call({ from: self.owner});
    } catch(e: any) {   
      console.log(e.message)   
    }
    console.log(`isOperational: ${result}`);
    return result;
  }

  async registerFirstAirline(firstAirline: any, owner: any): Promise<any> {
    console.log(`contractService  ::   registerFirstAirline`)
    console.log(`firstAirline : ${firstAirline}`)
    console.log(`owner : ${owner}`)
    let registerFirstAirlineResult;
    try {
      registerFirstAirlineResult = await this.flightSuretyApp.methods
            .registerFirstAirline(firstAirline)
            .send({from: owner});
    } catch(e: any) {   
      console.log(`registerFirstAirlineError: ${e.message}`)   
    }
    if(registerFirstAirlineResult) console.log(`registerFirstAirlineResult : ${JSON.stringify(registerFirstAirlineResult.events)}`);
    return registerFirstAirlineResult;
  }

 async registerAirline(airline: any, caller: any): Promise<any> {
  let self = this;
  let registerAirlineResult;
  try {
    registerAirlineResult = await self.flightSuretyApp.methods
        .registerAirline(airline)
        .send({from: caller, gas: 2000000});
  } catch(e: any) {   
    console.log(`registerAirlineError: ${e.message}`)   
  }
  if(registerAirlineResult) console.log(`registerAirlineResult: ${JSON.stringify(registerAirlineResult)} ${airline}`);
  return registerAirlineResult;
}

  async submitFundsAirline(airline: any): Promise<any> {
    console.log(`contractService  ::   submitFundsAirline`);
    let self = this;
    const AIRLINE_REGISTRATION_FEE = this.web3.utils.toWei("10", "ether");
    let submitFundsAirlineResult;
    try {
      submitFundsAirlineResult = await self.flightSuretyApp.methods
          .submitFundsAirline()
          .send({
            "from": airline,   
            "value": AIRLINE_REGISTRATION_FEE,
            "gas": 4712388,
            "gasPrice": 100000000000
          })
    } catch(e: any) {   
      console.log(e.message)   
    }
    if(submitFundsAirlineResult) console.log(`isFunded: ${JSON.stringify(submitFundsAirlineResult)}  ${airline}`);
    return submitFundsAirlineResult;
  }

  async getRegisteredAirline(): Promise<[]>{
    let result;
    let self = this;
    try {
      result = await self.flightSuretyApp.methods
          .getActiveAirlines()
          .call({ from: self.owner })
    } catch(e: any) {   
      console.log(e.message)   
    }
  return result;
  }

  async registerFlight(formValue: { airline: string; flightName: string}): Promise<boolean> {
    console.log(`contractService  ::   registerFlight`);
    let self = this;

    let airline = formValue.airline;
    let flightName = formValue.flightName;
    let timeStamp = Math.floor(Date.now() / 1000);

    let registerFlightResult;
    try {
      registerFlightResult = await self.flightSuretyApp.methods
          .registerFlight(this.web3.utils.fromAscii(flightName), timeStamp)
          .send({
            "from": airline,   
            "gas": 4712388,
            "gasPrice": 100000000000
          })
    } catch(e: any) {   
      console.log(e.message)   
    }

    if(registerFlightResult) console.log(`flightIsRegistered: ${JSON.stringify(registerFlightResult)}  ${airline} ${flightName}`);
    return registerFlightResult;
  }

  async getRegisteredFlights(formValue: {airline: string}) {
    console.log(`contractService  ::   registerFlight`);
    let self = this;

    let airline = formValue.airline;
    let getRegisteredFlightResult;

    try {
      getRegisteredFlightResult = await self.flightSuretyApp.methods
          .getAirlinesFlights(airline)
          .call({
            "from": airline,  
          })
    } catch(e: any) {   
      console.log(e.message)   
    }

    let stringResult: [] = [];
    for (let flight of getRegisteredFlightResult) {
        stringResult.push(this.web3.utils.toAscii(flight).substring(0,5) as never)
    }

    return stringResult;
  } 

  async buyInsurance(formValue: { airline: string; flights: string; amount: number}, msgSender: any): Promise<any> {
    console.log(`contractService  ::   buyInsurance`);
    let self = this;
    const airline = formValue.airline;
    const flight = this.web3.utils.fromAscii(formValue.flights); 
    let timeStamp = Math.floor(Date.now() / 1000);
    const FLIGHT_INSURANCE_AMOUNT = this.web3.utils.toWei(formValue.amount, "ether");
    let buyInsuranceResult;
    try {
      buyInsuranceResult = await self.flightSuretyApp.methods
          .buyInsurance(flight, timeStamp, airline)
          .send({
            "from": msgSender,   
            "value": FLIGHT_INSURANCE_AMOUNT,
            "gas": 4712388,
            "gasPrice": 100000000000
          })
    } catch(e: any) {   
      console.log(e.message)   
    }
    if(buyInsuranceResult) console.log(`is: ${JSON.stringify(buyInsuranceResult)}  ${airline}`);
    return buyInsuranceResult;
  }
  
}

