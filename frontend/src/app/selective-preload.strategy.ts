import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JwtTokenUtils } from './utils/jwt-token.utils';

/**
 * Preloads every lazy route except onboarding-only ones (data.onboardingOnly)
 * once the JWT "ns" claim says the user is fully onboarded. Anyone not provably
 * onboarded — logged out, mid-onboarding, or holding a pre-ns token — keeps the
 * previous preload-everything behavior, so the worst case is a chunk loading
 * on demand at navigation time, never breakage.
 *
 * catchError mirrors PreloadAllModules: without it, one failed chunk fetch
 * errors the RouterPreloader's single subscription and kills preloading for
 * the rest of the session.
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data?.['onboardingOnly'] && JwtTokenUtils.getNextStepHint() === 'complete') {
      return EMPTY;
    }
    return load().pipe(catchError(() => EMPTY));
  }
}
