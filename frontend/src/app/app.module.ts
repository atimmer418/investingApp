
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AppComponent } from './app.component';
// Restore Survey and related components
import { SurveyComponent } from './components/survey/survey.component';
import { SurveyResultsComponent } from './components/survey-results/survey-results.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component'; // Ensure this is imported
// Restore LinkbankComponent
import { LinkbankComponent } from './components/linkbank/linkbank.component';
// Restore RecommendationComponent
import { RecommendationComponent } from './components/recommendation/recommendation.component';
import { PortfolioService } from './services/portfolio.service';

// Define routes for the survey flow, including Linkbank and Recommendation
const routes: Routes = [
  { path: 'survey', component: SurveyComponent },
  { path: 'survey-results', component: SurveyResultsComponent },
  { path: 'portfolio', component: PortfolioComponent },
  { path: 'linkbank', component: LinkbankComponent },
  { path: 'recommendation', component: RecommendationComponent }, // Added RecommendationComponent route
  { path: '', redirectTo: '/survey', pathMatch: 'full' }, // Default to survey
  { path: '**', redirectTo: '/survey' } // Fallback to survey
];

@NgModule({
  declarations: [
    AppComponent,
    SurveyComponent,
    SurveyResultsComponent,
    PortfolioComponent,
    LinkbankComponent,
    RecommendationComponent, // Added RecommendationComponent to declarations
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    RouterModule.forRoot(routes),
    // MinimalTestComponent is removed as it's no longer needed
  ],
  providers: [PortfolioService],
  bootstrap: [AppComponent]
})
export class AppModule { }
