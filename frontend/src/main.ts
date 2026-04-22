import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules, withDisabledInitialNavigation } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { AppLockService } from './app/services/app-lock.service';

// Register Chart.js components globally
Chart.register(...registerables);

if (environment.production) {
  enableProdMode();
}

// Functional interceptor wrapper
const activityInterceptorFn = (req: any, next: any) => {
  // We need to inject AppLockService here. 
  // Since we are in a functional interceptor context, we can use inject()
  const appLockService = inject(AppLockService);
  appLockService.updateLastActiveTime();
  return next(req);
};

import { inject } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withDisabledInitialNavigation()),
    provideHttpClient(
      withInterceptors([activityInterceptorFn])
    ),
    provideAnimations()
  ],
});
