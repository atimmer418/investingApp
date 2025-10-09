import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { InvestmentDashboardComponent } from '../components/investment-dashboard/investment-dashboard.component';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, InvestmentDashboardComponent],
})
export class Tab1Page {
  constructor() {}
}
