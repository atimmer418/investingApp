import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'ai-chat',
    loadComponent: () => import('./pages/ai-chat/ai-chat.page').then( m => m.AiChatPage)
  },
  {
    path: 'survey-initial',
    loadComponent: () => import('./components/surveyinitial/surveyinitial.component').then(m => m.SurveyInitialComponent)
  },
  {
    path: 'fi-plan-results',
    loadComponent: () => import('./components/fi-plan-results/fi-plan-results.component').then(m => m.FiPlanResultsComponent)
  },
  {
    path: 'auth-finalize', // This is the route you navigate to
    loadComponent: () => import('./components/authfinalize/authfinalize.component').then(m => m.AuthFinalizeComponent)
    // Adjust path if you placed AuthFinalizeComponent elsewhere, e.g., directly under 'app/'
  },
  {
    path: 'kyc-verification',
    loadComponent: () => import('./components/kyc-verification/kyc-verification.component').then(m => m.KycVerificationComponent)
  },
  {
    path: 'investment-confirmation',
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
    path: 'investment-schedule',
    loadComponent: () => import('./components/investment-schedule/investment-schedule.component').then(m => m.InvestmentScheduleComponent)
  },
  {
    path: 'portfolio-customize',
    loadComponent: () => import('./components/portfolio-customize/portfolio-customize.component').then(m => m.PortfolioCustomizeComponent)
  },
  {
    path: 'portfolio-dashboard',
    loadComponent: () => import('./components/portfolio-dashboard/portfolio-dashboard.component').then(m => m.PortfolioDashboardComponent)
  },
  {
    path: 'tax-documents',
    loadComponent: () => import('./pages/tax-documents/tax-documents.page').then(m => m.TaxDocumentsPage)
  },
  {
    path: 'security-settings',
    loadComponent: () => import('./pages/security-settings/security-settings.page').then(m => m.SecuritySettingsPage)
  },
  {
    path: 'change-email',
    loadComponent: () => import('./pages/change-email/change-email.page').then(m => m.ChangeEmailPage)
  },
  {
    path: 'get-started',
    loadComponent: () => import('./components/get-started/get-started.component').then(m => m.GetStartedComponent)
    // TODO: This route might need to be set as the initial app route for new users,
    // or integrated into a guard that redirects new users here.
  },
  {
    path: 'recurring-investments',
    loadComponent: () => import('./recurring-investments/recurring-investments.page').then(m => m.RecurringInvestmentsPage)
  },
  {
    path: 'lump-sum-investment',
    loadComponent: () => import('./lump-sum-investment/lump-sum-investment.page').then(m => m.LumpSumInvestmentPage)
  },
  {
    path: 'change-bank-account',
    loadComponent: () => import('./change-bank-account/change-bank-account.page').then(m => m.ChangeBankAccountPage)
  },
  {
    path: 'beneficiaries',
    loadComponent: () => import('./beneficiaries/beneficiaries.page').then(m => m.BeneficiariesPage)
  },
  {
    path: 'beneficiaries/add',
    loadComponent: () => import('./beneficiaries/add-beneficiary.page').then(m => m.AddBeneficiaryPage)
  },
  {
    path: 'beneficiaries/edit/:id',
    loadComponent: () => import('./beneficiaries/add-beneficiary.page').then(m => m.AddBeneficiaryPage)
  },
  {
    path: 'sell-withdraw',
    loadComponent: () => import('./sell-withdraw/sell-withdraw.page').then(m => m.SellWithdrawPage)
  },
  {
    path: 'faq',
    loadComponent: () => import('./faq/faq.page').then(m => m.FaqPage)
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
  {
    path: 'strategy-detail',
    loadComponent: () => import('./pages/strategy-detail/strategy-detail.page').then( m => m.StrategyDetailPage)
  },
];
