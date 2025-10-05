import { Component, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
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

  constructor(private router: Router, private authService: AuthService) { }

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
    // Complete the getStarted step using the unified method
    this.authService.completeStep('getStarted').subscribe({
      next: () => {
        console.log('GetStarted step completed successfully');
        localStorage.setItem('getStartedCompleted', 'true');
        this.router.navigate(['/survey-initial'], { replaceUrl: true });
      },
      error: (err) => {
        console.log('GetStarted step could not be completed (likely not authenticated yet):', err);
        // Still update localStorage and navigate even if backend update fails
        localStorage.setItem('getStartedCompleted', 'true');
        this.router.navigate(['/survey-initial'], { replaceUrl: true });
      }
    });
  }
}