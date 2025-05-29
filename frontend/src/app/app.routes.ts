import { Routes } from '@angular/router';

export const routes: Routes = [
  // src/app/app.routes.ts
  // ... other routes
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
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: '',
    redirectTo: 'survey',
    pathMatch: 'full'
  },
];
