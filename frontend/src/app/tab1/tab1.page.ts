import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { PortfolioDashboardComponent } from '../components/portfolio-dashboard/portfolio-dashboard.component';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonContent, PortfolioDashboardComponent],
})
export class Tab1Page {
  constructor() {}
}
