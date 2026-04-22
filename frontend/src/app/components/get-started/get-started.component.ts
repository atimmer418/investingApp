import { Component, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import type { SwiperContainer } from 'swiper/element';
import type { Swiper } from 'swiper';

@Component({
  selector: 'app-get-started',
  templateUrl: './get-started.component.html',
  styleUrls: ['./get-started.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GetStartedComponent implements AfterViewInit {
  // Use ViewChild to get a reference to the swiper element
  @ViewChild('swiper') swiperRef: ElementRef<SwiperContainer> | undefined;

  isFadingOut = false;

  constructor(private navController: NavController, private authService: AuthService) { }

  ngAfterViewInit() {
    const swiperEl = this.swiperRef?.nativeElement;
  }

  getSetUp() {
    this.isFadingOut = true;
    // Set localStorage immediately so any progress checks during the fade see the right state
    localStorage.setItem('onboardingStep', '1');

    // Navigate after fade completes with no animation, then call the API.
    // Calling completeStep AFTER navigation means setupNavigationLogic fires
    // when router.url is already /survey-initial, so its duplicate-route guard prevents a slide-in.
    setTimeout(() => {
      this.navController.navigateRoot('/survey-initial', { animated: false, state: { fromGetStarted: true } });
      this.authService.completeStep('getStarted').subscribe({
        next: () => console.log('GetStarted step completed successfully'),
        error: (err) => console.log('GetStarted step could not be completed (likely not authenticated yet):', err)
      });
    }, 400);
  }
}