import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonTabs } from '@ionic/angular/standalone';
import { AccountStatusService } from '../services/account-status.service';
import { AuthService } from '../services/auth.service';
import { TabBarScrollService } from '../services/tab-bar-scroll.service';
import { Observable } from 'rxjs';
import { FirstTimeTourComponent } from '../components/first-time-tour/first-time-tour.component';
import { FloatingTabBarComponent } from '../components/floating-tab-bar/floating-tab-bar.component';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    IonTabs,
    FirstTimeTourComponent,
    FloatingTabBarComponent,
  ],
})
export class TabsPage implements OnInit {
  @ViewChild(IonTabs) tabs!: IonTabs;

  settingsTabBadge$: Observable<string | null>;
  isSubExpired = false;
  activeTab = 'tab1';

  constructor(
    private accountStatusService: AccountStatusService,
    private authService: AuthService,
    private scrollSvc: TabBarScrollService,
    private router: Router
  ) {
    this.settingsTabBadge$ = this.accountStatusService.settingsTabBadge$;
  }

  ngOnInit() {
    this.activeTab = this.deriveActiveTab(this.router.url);
    this.accountStatusService.refreshStatus();
    this.authService.userProgress$.subscribe((progress) => {
      const fullyOnboarded = progress?.investmentConfirmationCompleted === true;
      const hasActiveSub = progress?.selectedTier != null;
      const isPrivateBeta = progress?.privateBeta === true;
      // Private beta users bypass the subscription gate
      this.isSubExpired = fullyOnboarded && !hasActiveSub && !isPrivateBeta;
    });
  }

  /** Keep the active tab + indicator in sync with Ionic's stack changes. */
  onTabsDidChange(ev: { tab: string }) {
    this.activeTab = ev.tab;
    this.scrollSvc.reset();
    // Chat holds the bar full so no stray/cross-tab scroll can shrink it there.
    this.scrollSvc.setHoldFull(ev.tab === 'chat');
  }

  /** Navigate via Ionic so per-tab nav stacks are preserved. */
  selectTab(tab: string) {
    this.tabs.select(tab);
  }

  private deriveActiveTab(url: string): string {
    const m = url.match(/\/tabs\/([^/?#]+)/);
    return m ? m[1] : 'tab1';
  }
}
