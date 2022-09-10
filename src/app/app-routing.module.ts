import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AirlinesComponent } from './components/airlines/airlines.component';
import { ClientsComponent } from './components/clients/clients.component';

const routes: Routes = [
  { path: '', redirectTo: '/airlines', pathMatch: 'full' },
  { path: 'airlines', component: AirlinesComponent },
  { path: 'clients', component: ClientsComponent }  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
