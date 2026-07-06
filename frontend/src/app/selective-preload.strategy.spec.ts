import { Route } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SelectivePreloadStrategy } from './selective-preload.strategy';

/** Build an unsigned JWT-shaped token whose payload decodes to the given claims. */
function fakeJwt(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${payload}.signature`;
}

describe('SelectivePreloadStrategy', () => {
  let strategy: SelectivePreloadStrategy;
  let loadCalled: boolean;
  let load: () => any;

  const onboardingRoute: Route = { path: 'get-started', data: { onboardingOnly: true } };
  const appRoute: Route = { path: 'my-profile' };

  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const pastExp = Math.floor(Date.now() / 1000) - 3600;

  beforeEach(() => {
    strategy = new SelectivePreloadStrategy();
    loadCalled = false;
    load = () => {
      loadCalled = true;
      return of('loaded');
    };
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('jwtExpiration');
  });

  afterEach(() => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('jwtExpiration');
  });

  function storeToken(claims: Record<string, unknown>): void {
    localStorage.setItem('jwtToken', fakeJwt(claims));
    if (typeof claims['exp'] === 'number') {
      localStorage.setItem('jwtExpiration', String(claims['exp']));
    }
  }

  it('skips an onboardingOnly route when ns is complete', (done) => {
    storeToken({ ns: 'complete', exp: futureExp });
    strategy.preload(onboardingRoute, load).subscribe({
      complete: () => {
        expect(loadCalled).toBeFalse();
        done();
      },
    });
  });

  it('preloads an onboardingOnly route when the complete-token is expired (strict reader)', () => {
    // In practice AuthService.checkExistingSession() deletes expired tokens at
    // bootstrap before the preloader can run; this covers the mid-session window.
    storeToken({ ns: 'complete', exp: pastExp });
    strategy.preload(onboardingRoute, load).subscribe();
    expect(loadCalled).toBeTrue();
  });

  it('swallows a failing chunk load instead of erroring the preloader stream', (done) => {
    let errored = false;
    strategy.preload(appRoute, () => throwError(() => new Error('chunk fetch failed'))).subscribe({
      error: () => (errored = true),
      complete: () => {
        expect(errored).toBeFalse();
        done();
      },
    });
  });

  it('preloads an onboardingOnly route while mid-onboarding', () => {
    storeToken({ ns: 'kyc-verification', exp: futureExp });
    strategy.preload(onboardingRoute, load).subscribe();
    expect(loadCalled).toBeTrue();
  });

  it('preloads an onboardingOnly route when no token is stored (logged out)', () => {
    strategy.preload(onboardingRoute, load).subscribe();
    expect(loadCalled).toBeTrue();
  });

  it('preloads an onboardingOnly route when the token has no ns claim (pre-ns JWT)', () => {
    storeToken({ exp: futureExp });
    strategy.preload(onboardingRoute, load).subscribe();
    expect(loadCalled).toBeTrue();
  });

  it('preloads an unflagged route even when ns is complete', () => {
    storeToken({ ns: 'complete', exp: futureExp });
    strategy.preload(appRoute, load).subscribe();
    expect(loadCalled).toBeTrue();
  });

  it('preloads when the stored token is malformed rather than throwing', () => {
    localStorage.setItem('jwtToken', 'not-a-jwt');
    strategy.preload(onboardingRoute, load).subscribe();
    expect(loadCalled).toBeTrue();
  });
});
