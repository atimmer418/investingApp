import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouteReuseStrategy, provideRouter, withPreloading, withDisabledInitialNavigation } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { SelectivePreloadStrategy } from './app/selective-preload.strategy';
import { environment } from './environments/environment';

// Register Chart.js components globally
Chart.register(...registerables);

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(SelectivePreloadStrategy), withDisabledInitialNavigation()),
    provideHttpClient(),
    provideAnimations()
  ],
});
// build-trigger-1780259715
