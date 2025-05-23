import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { routes } from './app/app-routing.module'

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter } from '@angular/router';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, { // CRUCIAL: Bootstrapping the standalone AppComponent
  providers: [
    // HTTP Client
    provideHttpClient(withInterceptorsFromDi()),

    // Ionic
    importProvidersFrom(IonicModule.forRoot({})), // Provides Ionic services and makes components available globally if needed
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },

    // Router
    provideRouter(routes), // Provide your application's routes

    // Example: If you still wanted to get providers from AppModule (e.g., if it has many complex providers)
    // importProvidersFrom(AppModule),
  ]
}).catch(err => console.error(err));