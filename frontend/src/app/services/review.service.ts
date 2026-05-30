import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class ReviewService {

  requestReviewIfFirstMFU(): void {
    if (localStorage.getItem('hasSeenFirstMFU')) return;
    localStorage.setItem('hasSeenFirstMFU', 'true');
    this.requestReview();
  }

  private requestReview(): void {
    if (!Capacitor.isNativePlatform()) return;
    try {
      // Use a variable so tsc does not statically resolve the specifier.
      // This avoids a TS2307 error when @capacitor/rate-app is not installed.
      const specifier = '@capacitor/rate-app';
      import(/* @vite-ignore */ specifier).then((mod: any) => {
        mod.RateApp.requestReview().catch((err: any) => {
          console.warn('[ReviewService] requestReview failed:', err);
        });
      }).catch(() => {
        // @capacitor/rate-app not installed — silent
      });
    } catch (_) {
      // plugin unavailable on this platform
    }
  }
}
