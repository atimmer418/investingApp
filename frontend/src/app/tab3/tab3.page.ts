import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonList } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonList],
})
export class Tab3Page {
  public settingsOptions: string[] = ["Adjust Payments", "Adjust Portfolio", "Pause Contributions", "Set Beneficiaries"];
  constructor() {}

  onSettingClick(setting: string) {
    console.log('Clicked setting:', setting);
  }
}
