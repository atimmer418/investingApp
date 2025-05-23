
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router'; // Added RouterModule and Routes
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component';
import { LinkbankComponent } from './components/linkbank/linkbank.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { RecommendationComponent } from './components/recommendation/recommendation.component';
import { SurveyComponent } from './components/survey/survey.component';
import { SurveyResultsComponent } from './components/survey-results/survey-results.component'; // Added SurveyResultsComponent
// import { PortfolioService } from './services/portfolio.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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

  ],
  imports: [
    HttpClientModule,
    AppRoutingModule,
    LinkbankComponent,
    PortfolioComponent,
    RecommendationComponent,
    SurveyComponent,
    SurveyResultsComponent
    // BrowserModule,
    // IonicModule.forRoot(),
    // RouterModule.forRoot(routes),
  ],
  providers: [
    // { provide: RouteReuseStrategy, useClass: IonicRouteStrategy } // Standard Ionic provider
    // Your other global services if not providedIn: 'root'
  ],
  // bootstrap: [AppComponent]
})
export class AppModule { }
