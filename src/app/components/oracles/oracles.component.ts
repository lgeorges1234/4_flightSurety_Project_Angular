import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { FlightClass } from 'src/app/models/flight-class.model';
import { ContractService } from 'src/app/services/contract.service';

@Component({
  selector: 'app-oracles',
  templateUrl: './oracles.component.html',
  styleUrls: ['./oracles.component.css']
})

export class OraclesComponent implements OnInit {
  oracleForm!: FormGroup;
  airlineList: [] = [];
  flightList: FlightClass[] = [];
  flightNameList: string[] = [];
  owner: any;
  eventToDisplay: any;
  resultToDisplay: any;

  accountValidationMessages = {

  };

  constructor(private contractService: ContractService, private fb:FormBuilder) { }

  ngOnInit(): void {
    this.initialize();
    this.createForms();
  }

  async initialize(): Promise<void> {
    await this.getActiveAirlines();
    this.owner = await this.getAccount(0);
    // await this.getFlights();
  }

  createForms() {
    this.oracleForm = this.fb.group({
      airline: new FormControl(this.airlineList),
      flight: new FormControl(this.flightList)
    });
  }

  async getAccount(index: number): Promise<any> {
    let result = await this.contractService.getAccount(index);
    return result;
  }

  async getActiveAirlines(): Promise<void> {
    let result = await this.contractService.getRegisteredAirline();
    this.airlineList = result;
    // console.log(`airline.components  :: getActivetAirlines  ::   this.airlineList`);
    // console.log(this.airlineList);
  }

  async getFlights(): Promise<void> {
    let getRegisteredFlightsResult = await this.contractService.getRegisteredFlights(this.oracleForm.value);
    for(let flight of getRegisteredFlightsResult) {
      let getFlightNameResult = await this.contractService.getFlightName(flight);
      let getFlightTimestampResult = await this.contractService.getFlightTimestamp(flight);
      let getFlightStatusCode = await this.contractService.getFlightStatusCode(flight);
      this.flightList.push({id: flight, name: getFlightNameResult, timestamp: getFlightTimestampResult, statusCode: getFlightStatusCode})
    }
    for(let flight of this.flightList) this.flightNameList.push(flight.name);
  }

  submitForm() {
    let self = this;
    if (this.oracleForm.invalid) {
      alert('clients.components :: submitForm :: Form invalid');
      return;
    } else {
      console.log('clients.components :: submitForm :: this.airlineForm.value');
      const airline = this.oracleForm.value.airline;
      const flightName = this.oracleForm.value.flight.name;
      const flightTimestamp = this.oracleForm.value.flight.timestamp;
      this.contractService.fetchFlightStatus(airline, flightName, flightTimestamp,  this.owner)
      .then(function(data) {
        let flightName =  self.contractService.hexToString(data.returnValues.flight);
        self.eventToDisplay = data.event;
        self.resultToDisplay = `Airline: ${data.returnValues.airline} Flights: ${flightName}`;
      })
      .catch(function(error: any) {
      console.log(error);
      });
    }
  }

}
