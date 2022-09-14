import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ContractService } from 'src/app/services/contract.service';


@Component({
  selector: 'app-airlines',
  templateUrl: './airlines.component.html',
  styleUrls: ['./airlines.component.css']
})
export class AirlinesComponent implements OnInit {
  airlineForm!: FormGroup;
  airlineList: [] = [];
  owner: any;
  firstAirline: any;
  flight: any;
  eventToDisplay: any;
  resultToDisplay: any;
  
  accountValidationMessages = {
    flightName: [
      { type: 'required', message: 'Flight is required' },
      { type: 'minLength', message: 'Transfer Address must be 5 characters long' },
      { type: 'maxLength', message: 'Transfer Address must be 5  characters long' }
    ]
  };

  constructor(private contractService: ContractService, private fb:FormBuilder) { }

  ngOnInit(): void {

    this.initialize();
    this.createForms();
  }

  async initialize(): Promise<void> {
    await this.getActiveAirlines();
    if(this.airlineList.length == 0) await this.activeFirstAirlines();
    await this.getActiveAirlines();
    if(this.airlineList.length < 4) await this.activeAirlines();
    await this.getActiveAirlines();
  }

  createForms() {
    this.airlineForm = this.fb.group({
      airline:new FormControl(this.airlineList),
      flightName: new FormControl(this.flight, Validators.compose([
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(5)
      ]))
    });
  }

  submitForm() {
    let self = this;
    if (this.airlineForm.invalid) {
      alert('airlines.components :: submitForm :: Form invalid');
      return;
    } else {
      console.log('airlines.components :: submitForm :: this.airlineForm.value');
      console.log(this.airlineForm.value);
      this.contractService.registerFlight(this.airlineForm.value)
      .then(function(data) {
        let flightName =  self.contractService.hexToString(data.returnValues.flightName);
        self.eventToDisplay = data.event;
        self.resultToDisplay = `Airline: ${data.returnValues.airline} Timestamp: ${data.returnValues.timeStamp} Flights: ${flightName}`;
      }).catch(function(error: any) {
      console.log(error);
      });
    }
  }

  async getAccount(index: number): Promise<any> {
    let result = await this.contractService.getAccount(index);
    return result;
  }

  async activeFirstAirlines(): Promise<void> {
    this.owner = await this.getAccount(0);
    this.firstAirline = await this.getAccount(1);
    let registerFirstAirlineResult = await this.contractService.registerFirstAirline(this.firstAirline, this.owner);
    console.log(`airline.components  :: activeFirstAirlines  ::   registerFirstAirline`);
    console.log(registerFirstAirlineResult);
    let submitFirstAirlineResult = await this.contractService.submitFundsAirline(this.firstAirline);
    console.log(`airline.components  :: activeFirstAirlines  ::   submitFirstAirline`);
    console.log(submitFirstAirlineResult);
  }

  async activeAirlines(): Promise<void> {
    this.firstAirline = await this.getAccount(1);
    for (let counter = 2; counter < 5; counter++ ){
      let airline = await this.getAccount(counter);
      let isRegisteredResult = await this.contractService.registerAirline(airline, this.firstAirline);
      if(isRegisteredResult) console.log(`isRegisteredResult : ${JSON.stringify(isRegisteredResult)}`)
      let isFundedResult = await this.contractService.submitFundsAirline(airline);
      if(isFundedResult) console.log(`isFundedResult : ${JSON.stringify(isFundedResult)}`);
    }
  }

  async getActiveAirlines(): Promise<void> {
      let result = await this.contractService.getRegisteredAirline();
      this.airlineList = result;
      // console.log(`airline.components  :: getActivetAirlines  ::   this.airlineList`);
      // console.log(this.airlineList);
  }

}

