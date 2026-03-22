import { Component, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import type { SwiperContainer } from 'swiper/element';
import type { Swiper } from 'swiper';

@Component({
  selector: 'app-get-started',
  templateUrl: './get-started.component.html',
  styleUrls: ['./get-started.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GetStartedComponent implements AfterViewInit {
  // Use ViewChild to get a reference to the swiper element
  @ViewChild('swiper') swiperRef: ElementRef<SwiperContainer> | undefined;

  isLastSlide = false;
  isFadingOut = false;

  constructor(private navController: NavController, private authService: AuthService) { }

  ngAfterViewInit() {
    // Refresh localStorage progress when component loads (for non-authenticated users)
    this.authService.refreshLocalStorageProgress();
    
    // Only mark this step as incomplete if user hasn't completed later steps
    // This prevents regression when authenticated users land on get-started page
    const currentProgress = this.authService.getUnifiedProgress();
    const hasCompletedLaterSteps = currentProgress.surveyInitialCompleted || 
                                  currentProgress.fiPlanResultsCompleted || 
                                  currentProgress.authFinalizeCompleted ||
                                  currentProgress.kycVerificationCompleted;
    
    if (!hasCompletedLaterSteps) {
      this.authService.markStepIncomplete('getStarted').subscribe({
        next: () => console.log('GetStarted step marked as incomplete'),
        error: (err) => console.log('GetStarted step could not be marked incomplete (likely not authenticated yet):', err)
      });
    } else {
      console.log('GetStarted: User has completed later steps, not marking as incomplete');
    }
    
    const swiperEl = this.swiperRef?.nativeElement;

    if (!swiperEl) return;

    // Register progress event
    swiperEl.addEventListener('swiperprogress', (event: any) => {
      const [swiper, progress] = event.detail;

      if (progress === 1) {
        this.isLastSlide = true;
      } else {
        this.isLastSlide = false;
      }
    });
  }

  // --- No longer need onSlideChange() or checkSlideStatus() ---

  getSetUp() {
    this.isFadingOut = true;
    // Set localStorage immediately so any progress checks during the fade see the right state
    localStorage.setItem('getStartedCompleted', 'true');

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