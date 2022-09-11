import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ContractService } from 'src/app/services/contract.service';
import { FlightClass } from 'src/app/models/flight-class.model';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.css']
})
export class ClientsComponent implements OnInit {
  clientForm!: FormGroup;
  airlineList: [] = [];
  flightList: FlightClass[] = [];
  flightNameList: string[] = [];
  amount: number = 0;
  client: any;

  accountValidationMessages = {
    amount: [
      { type: 'required', message: 'Amount is required' },
      { type: 'pattern', message: 'Amount must be a positive number between 0 and 1' }
    ],
  };

  constructor(private contractService: ContractService, private fb:FormBuilder) { }

  ngOnInit(): void {

    this.initialize();
    this.createForms();
  }

  async initialize(): Promise<void> {
    await this.getActiveAirlines();
    this.client = await this.getAccount(8);
    // await this.getFlights();
  }

  async getAccount(index: number): Promise<any> {
    let result = await this.contractService.getAccount(index);
    return result;
  }

  createForms() {
    this.clientForm = this.fb.group({
      airline: new FormControl(this.airlineList),
      flight: new FormControl(this.flightList),
      amount: new FormControl(this.amount, Validators.compose([
        Validators.required,
        Validators.pattern('^[+]?([.]\\d+|\\d+[.]?\\d*)$')
      ]))
    });
  }

  submitForm() {
    if (this.clientForm.invalid) {
      alert('clients.components :: submitForm :: Form invalid');
      return;
    } else {
      console.log('clients.components :: submitForm :: this.airlineForm.value');
      console.log(this.clientForm.value);
      const airline = this.clientForm.value.airline;
      const flightName = this.clientForm.value.flight.name;
      const flightTimestamp = this.clientForm.value.flight.timestamp;
      const amount = this.clientForm.value.amount;
      this.contractService.buyInsurance(flightName, flightTimestamp, airline , this.client, amount).
      then(function() {}).catch(function(error: any) {
      console.log(error);
      });
    }
  }

  async getActiveAirlines(): Promise<void> {
    let result = await this.contractService.getRegisteredAirline();
    this.airlineList = result;
    // console.log(`airline.components  :: getActivetAirlines  ::   this.airlineList`);
    // console.log(this.airlineList);
  }

  async getFlights(): Promise<void> {
    let getRegisteredFlightsResult = await this.contractService.getRegisteredFlights(this.clientForm.value);
    for(let flight of getRegisteredFlightsResult) {
      let getFlightNameResult = await this.contractService.getFlightName(flight);
      let getFlightTimestampResult = await this.contractService.getFlightTimestamp(flight);
      let getFlightStatusCode = await this.contractService.getFlightStatusCode(flight);
      this.flightList.push({id: flight, name: getFlightNameResult, timestamp: getFlightTimestampResult, statusCode: getFlightStatusCode})
    }
    for(let flight of this.flightList) this.flightNameList.push(flight.name);
  }
}
