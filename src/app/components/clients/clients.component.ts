import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ContractService } from 'src/app/services/contract.service';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.css']
})
export class ClientsComponent implements OnInit {
  clientForm!: FormGroup;
  airlineList: [] = [];
  flightList: [] = [];
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
      flights: new FormControl(this.flightList),
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
      this.contractService.buyInsurance(this.clientForm.value, this.client).
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
    console.log(this.clientForm.value)
    let result = await this.contractService.getRegisteredFlights(this.clientForm.value);
    this.flightList = result;
  }
}
