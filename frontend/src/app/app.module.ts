
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router'; // Added RouterModule and Routes
import { IonicModule } from '@ionic/angular';

import { AppComponent } from './app.component';
import { LinkbankComponent } from './components/linkbank/linkbank.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { RecommendationComponent } from './components/recommendation/recommendation.component';
import { SurveyComponent } from './components/survey/survey.component';
import { SurveyResultsComponent } from './components/survey-results/survey-results.component'; // Added SurveyResultsComponent
import { PortfolioService } from './services/portfolio.service';

// Define routes
const routes: Routes = [
  { path: 'survey', component: SurveyComponent },
  { path: 'survey-results', component: SurveyResultsComponent },
  { path: 'portfolio', component: PortfolioComponent },
  { path: 'linkbank', component: LinkbankComponent }, // Assuming this is part of the app
  { path: 'recommendation', component: RecommendationComponent }, // Assuming this is part of the app
  { path: '', redirectTo: '/survey', pathMatch: 'full' }, // Default route
  { path: '**', redirectTo: '/survey' } // Fallback for unknown paths
];

@NgModule({
  declarations: [
    AppComponent,
    LinkbankComponent,
    PortfolioComponent,
    RecommendationComponent,
    SurveyComponent,
    SurveyResultsComponent // Added SurveyResultsComponent here
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    RouterModule.forRoot(routes) // Added RouterModule with routes
  ],
  providers: [PortfolioService],
  bootstrap: [AppComponent]
})
export class AppModule { }
