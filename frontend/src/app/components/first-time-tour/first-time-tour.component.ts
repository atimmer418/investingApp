import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavController } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { FirstTimeTourService } from '../../services/first-time-tour.service';

interface TourStep {
  step: number;
  label: string;
  targetSelector: string | null;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    label: 'Your portfolio lives here.',
    targetSelector: null
  },
  {
    step: 2,
    label: 'Explore retirement strategies and run simulations here.',
    targetSelector: null
  },
  {
    step: 3,
    label: 'Your settings and referral code are here.',
    targetSelector: 'ion-tab-button[tab="tab3"]'
  },
  {
    step: 4,
    label: 'Tap to start your first conversation with Fred.',
    targetSelector: null
  }
];

@Component({
  selector: 'app-first-time-tour',
  templateUrl: './first-time-tour.component.html',
  styleUrls: ['./first-time-tour.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class FirstTimeTourComponent implements OnInit, OnDestroy {

  currentStep: number | null = null;
  highlightRect: { top: number; left: number; width: number; height: number } | null = null;

  private subscription: Subscription | null = null;
  private navigating = false;

  constructor(
    private tourService: FirstTimeTourService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    this.subscription = this.tourService.tourStep$.subscribe(async step => {
      this.currentStep = step;
      this.highlightRect = null;

      if (step === null) return;

      if (step === 2 && !this.navigating) {
        this.navigating = true;
        await this.navCtrl.navigateRoot('/tabs/tab2', { animated: true });
        this.navigating = false;
      }

      if (step === 4 && !this.navigating) {
        this.navigating = true;
        await this.navCtrl.navigateRoot('/tabs/chat', { animated: true });
        this.navigating = false;
      }

      // After navigation, try to highlight target element
      const tourStep = TOUR_STEPS.find(s => s.step === step);
      if (tourStep?.targetSelector) {
        setTimeout(() => {
          this.updateHighlight(tourStep.targetSelector!);
        }, 400);
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  updateHighlight(selector: string) {
    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      this.highlightRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
    }
  }

  get isVisible(): boolean {
    return this.currentStep !== null;
  }

  get stepInfo(): TourStep | null {
    return TOUR_STEPS.find(s => s.step === this.currentStep) ?? null;
  }

  get stepLabel(): string {
    return this.stepInfo?.label ?? '';
  }

  get isLastStep(): boolean {
    return this.currentStep === 4;
  }

  onNext() {
    if (this.isLastStep) {
      this.tourService.completeTour();
    } else {
      this.tourService.nextStep();
    }
  }

  onSkip() {
    this.tourService.skipTour();
  }
}
