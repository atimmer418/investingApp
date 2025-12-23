import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, pieChartOutline, trendingUpOutline, personOutline, chatbubblesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon],
})
export class TabsPage {

  constructor() {
    addIcons({ pieChartOutline, trendingUpOutline, personOutline, chatbubblesOutline, triangle, ellipse, square });
  }
}
