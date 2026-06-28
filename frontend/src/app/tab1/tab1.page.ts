import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { PortfolioDashboardComponent } from '../components/portfolio-dashboard/portfolio-dashboard.component';
import { TabBarScrollDirective } from '../directives/tab-bar-scroll.directive';
import { AuthService } from '../services/auth.service';
import { FirstTimeTourService } from '../services/first-time-tour.service';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonContent, PortfolioDashboardComponent, TabBarScrollDirective],
})
export class Tab1Page implements OnInit, OnDestroy {

  private progressSub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private tourService: FirstTimeTourService
  ) {}

  ngOnInit() {
    // Wait for userProgress to be populated, then check tour eligibility once
    this.progressSub = this.authService.userProgress$
      .pipe(
        filter(p => p !== null),
        take(1)
      )
      .subscribe(progress => {
        if (
          progress?.investmentConfirmationCompleted === true &&
          !this.tourService.hasSeenTour()
        ) {
          this.tourService.startTour();
        }
      });
  }

  ngOnDestroy() {
    this.progressSub?.unsubscribe();
  }
}
