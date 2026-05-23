import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const TOUR_STORAGE_KEY = 'hasSeenFirstTimeTour';

@Injectable({
  providedIn: 'root'
})
export class FirstTimeTourService {

  private tourStepSubject = new BehaviorSubject<number | null>(null);
  public tourStep$ = this.tourStepSubject.asObservable();

  get currentStep(): number | null {
    return this.tourStepSubject.value;
  }

  hasSeenTour(): boolean {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  }

  startTour(): void {
    if (this.hasSeenTour()) return;
    this.tourStepSubject.next(1);
  }

  nextStep(): void {
    const current = this.tourStepSubject.value;
    if (current === null) return;
    if (current >= 4) {
      this.completeTour();
    } else {
      this.tourStepSubject.next(current + 1);
    }
  }

  completeTour(): void {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    this.tourStepSubject.next(null);
  }

  skipTour(): void {
    this.completeTour();
  }
}
