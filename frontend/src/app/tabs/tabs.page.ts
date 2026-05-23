import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, pieChartOutline, trendingUpOutline, personOutline, chatbubblesOutline } from 'ionicons/icons';
import { AccountStatusService } from '../services/account-status.service';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [CommonModule, AsyncPipe, IonTabs, IonTabBar, IonTabButton, IonIcon, IonBadge],
})
export class TabsPage implements OnInit {
  settingsTabBadge$: Observable<string | null>;
  isSubExpired = false;

  constructor(
    private accountStatusService: AccountStatusService,
    private authService: AuthService
  ) {
    addIcons({ pieChartOutline, trendingUpOutline, personOutline, chatbubblesOutline, triangle, ellipse, square });
    this.settingsTabBadge$ = this.accountStatusService.settingsTabBadge$;
  }

  ngOnInit() {
    this.accountStatusService.refreshStatus();
    this.authService.userProgress$.subscribe(progress => {
      const fullyOnboarded = progress?.investmentConfirmationCompleted === true;
      const hasActiveSub = progress?.selectedTier != null;
      const isPrivateBeta = progress?.privateBeta === true;
      // Private beta users bypass the subscription gate
      this.isSubExpired = fullyOnboarded && !hasActiveSub && !isPrivateBeta;
    });
  }
}
