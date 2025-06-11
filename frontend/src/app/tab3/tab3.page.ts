import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonList } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonList, ExploreContainerComponent],
})
export class Tab3Page {
  public settingsOptions: string[] = ["Adjust Payments", "Adjust Portfolio", "Pause Contributions", "Set Beneficiaries"];
  constructor() {}

  onSettingClick(setting: string) {
    console.log('Clicked setting:', setting);
  }
}
