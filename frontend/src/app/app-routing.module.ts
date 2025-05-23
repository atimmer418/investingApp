import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

// --- Import your Page Components or Standalone Page Components ---
// Example for NON-standalone page components (if you have them):
// import { HomePage } from './components/home/home.component'; // Assuming HomePage is NOT standalone
// import { SurveyPage } from './components/survey/survey.component'; // Assuming SurveyPage is NOT standalone
// import { PlaidLinkPage } from './components/plaid-link/plaid-link.component'; // Assuming PlaidLinkPage is NOT standalone
// import { DashboardPage } from './components/dashboard/dashboard.component';

// If your components are STANDALONE components, you will use `loadComponent` (see examples below)

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'survey', // Or your desired default path (e.g., 'home', 'login')
    pathMatch: 'full'
  },
  // --- Examples of Route Definitions ---

  // Example: Route to a NON-standalone component (if SurveyPage is NOT standalone)
  // {
  //   path: 'survey',
  //   component: SurveyPage // Component directly referenced
  // },

  // Example: Route to a LAZY-LOADED NON-standalone module and its components
  // This is common if 'home' is a feature module with its own routing.
  // {
  //   path: 'home',
  //   loadChildren: () => import('./components/home/home.module').then( m => m.HomePageModule)
  // },

  // Example: Route to a LAZY-LOADED STANDALONE component (Recommended for components)
  {
    path: 'survey', // URL path will be your-app.com/survey
    loadComponent: () => import('./components/survey/survey.component').then(m => m.SurveyComponent)
    // Assuming survey.component.ts exports a standalone SurveyPage component
  },
//   {
//     path: 'plaid-link',
//     loadComponent: () => import('./components/plaid-link/plaid-link.component').then(m => m.PlaidLinkPage)
//     // Assuming plaid-link.component.ts exports a standalone PlaidLinkPage component
//   },
//   {
//     path: 'dashboard',
//     loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardPage)
//     // Assuming dashboard.component.ts exports a standalone DashboardPage component
//   },
  // Add more routes here as needed for your application
  // {
  //   path: 'login',
  //   loadComponent: () => import('./components/login/login.component').then(m => m.LoginPage)
  // },
  // {
  //   path: 'portfolio',
  //   canActivate: [AuthGuard], // Example of a route guard
  //   loadComponent: () => import('./components/portfolio/portfolio.component').then(m => m.PortfolioPage)
  // },

  // Wildcard route for 404 Not Found (optional, place last)
  // {
  //   path: '**',
  //   redirectTo: 'home' // Or a dedicated 404 page
  // }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
    // `PreloadAllModules` preloads all lazy-loaded modules/components after the app has bootstrapped.
    // You can also use `NoPreloading` or create a custom preloading strategy.
  ],
  exports: [RouterModule] // Export RouterModule so it's available to AppModule
})
export class AppRoutingModule { }