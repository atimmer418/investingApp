
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { SurveyComponent } from './components/survey/survey.component';
import { SurveyResultsComponent } from './components/survey-results/survey-results.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    SurveyComponent,
    SurveyResultsComponent
  ],
  imports: [
    AppRoutingModule,
    CommonModule,
    RouterModule
  ],
  providers: [],
  // bootstrap: [] // Ensure bootstrap is empty or removed
})
export class AppModule { }
