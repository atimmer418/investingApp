import { Routes } from '@angular/router';

export const routes: Routes = [
  // src/app/app.routes.ts
  // ... other routes
  {
    path: 'setup-2fa',
    loadComponent: () => import('./components/twofactorsetup/twofactorsetup.component').then(m => m.TwoFactorSetupComponent)
  },
  {
    path: 'survey-initial',
    loadComponent: () => import('./components/surveyinitial/surveyinitial.component').then(m => m.SurveyInitialComponent)
  },
  {
    path: 'auth-finalize', // This is the route you navigate to
    loadComponent: () => import('./components/authfinalize/authfinalize.component').then(m => m.AuthFinalizeComponent)
    // Adjust path if you placed AuthFinalizeComponent elsewhere, e.g., directly under 'app/'
  },
  {
    path: 'confirm-investment',
    loadComponent: () => import('./components/investmentconfirmation/investmentconfirmation.component').then(m => m.InvestmentConfirmationComponent)
    // Or from './pages/investment-confirmation/investment-confirmation.page' if you use .page convention
  },
  {
    path: 'stock-selection',
    loadComponent: () => import('./components/stockselection/stockselection.component').then(m => m.StockSelectionComponent)
  },
  {
    path: 'link-bank', // Or 'plaid-link'
    loadComponent: () => import('./components/linkplaid/linkplaid.component').then(m => m.LinkPlaidComponent)
  },
  {
    path: 'survey',
    loadComponent: () => import('./components/survey/survey.component').then(m => m.SurveyComponent)
    // You could add a canActivate guard here if needed later
  },
  {
    path: 'get-started',
    loadComponent: () => import('./components/get-started/get-started.component').then(m => m.GetStartedComponent)
    // TODO: This route might need to be set as the initial app route for new users,
    // or integrated into a guard that redirects new users here.
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: '',
    redirectTo: 'get-started',
    pathMatch: 'full'
  },
];
