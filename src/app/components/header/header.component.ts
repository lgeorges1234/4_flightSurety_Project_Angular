import { Component, OnInit } from '@angular/core';
import { ContractService } from 'src/app/services/contract.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  providers: [ContractService]
})
export class HeaderComponent implements OnInit {
  contractStatus: boolean = false;
  constructor(private contractService: ContractService) { }

  ngOnInit(): void {
    this.setStatus();
  }

  async setStatus(): Promise<void> {
    this.contractStatus = await this.contractService.isOperational();
  }

}
