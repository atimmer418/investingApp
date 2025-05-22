
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app.component';
import { LinkbankComponent } from './components/linkbank/linkbank.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { RecommendationComponent } from './components/recommendation/recommendation.component';
import { SurveyComponent } from './components/survey/survey.component';
import { PortfolioService } from './services/portfolio.service';

@NgModule({
  declarations: [
    AppComponent,
    LinkbankComponent,
    PortfolioComponent,
    RecommendationComponent,
    SurveyComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot()
  ],
  providers: [PortfolioService],
  bootstrap: [AppComponent]
})
export class AppModule { }
