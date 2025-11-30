import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { RetirementPlanningComponent } from '../components/retirement-planning/retirement-planning.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonContent, RetirementPlanningComponent]
})
export class Tab2Page {
  constructor() { }
}
