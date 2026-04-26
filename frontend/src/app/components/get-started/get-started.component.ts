import { Component, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { NavController, createAnimation } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import type { SwiperContainer } from 'swiper/element';

@Component({
  selector: 'app-get-started',
  templateUrl: './get-started.component.html',
  styleUrls: ['./get-started.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GetStartedComponent implements AfterViewInit {
  @ViewChild('swiper') swiperRef: ElementRef<SwiperContainer> | undefined;

  private preloadStarted = false;

  constructor(private navController: NavController, private authService: AuthService) { }

  ngAfterViewInit() {
    const swiperEl = this.swiperRef?.nativeElement;
    if (!swiperEl) return;
    (swiperEl as any).addEventListener('slidechange', () => {
      const swiper = (swiperEl as any).swiper;
      if (swiper?.activeIndex === 4 && !this.preloadStarted) {
        this.preloadStarted = true;
        this.preloadSurveyInitialAssets();
      }
    });
  }

  private preloadSurveyInitialAssets() {
    new Image().src = '/assets/images/whenPiggybanksFly.png';
    document.fonts.load('700 16px "Manrope"').catch(() => {});
    document.fonts.load('400 24px "Material Symbols Outlined"').catch(() => {});
  }

  getSetUp() {
    localStorage.setItem('onboardingStep', '1');

    this.navController.navigateRoot('/survey-initial', {
      animated: true,
      animation: (baseEl: any, opts: any) => {
        const leaveEl = opts.leavingEl;
        const enterEl = opts.enteringEl;

        // Keep the entering page behind the leaving page during the fade.
        enterEl.style.zIndex = '1';
        leaveEl.style.zIndex = '2';

        return createAnimation()
          .duration(2750)
          .easing('ease-out')
          .addAnimation([
            // Get-started fades out — user sees it disappearing
            createAnimation().addElement(leaveEl).fromTo('opacity', '1', '0'),
            // Survey-initial sits fully visible underneath from the start
            createAnimation().addElement(enterEl).fromTo('opacity', '1', '1'),
          ]);
      }
    });

    this.authService.completeStep('getStarted').subscribe({
      next: () => console.log('GetStarted step completed successfully'),
      error: (err) => console.log('GetStarted step could not be completed (likely not authenticated yet):', err)
    });
  }
}
