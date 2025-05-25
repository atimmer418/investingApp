import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NavigationExtras, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule],
})

export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    this.checkSurveyStatusAndNavigate();
  }
  
  checkSurveyStatusAndNavigate() {

    // remove this later
    localStorage.setItem('initialSurveyCompleted', 'false')
    localStorage.setItem('linkplaidCompleted', 'false')
    localStorage.setItem('investmentSurveyCompleted', 'false')
    // remove this later

    const surveyCompleted = localStorage.getItem('surveyCompleted'); // Or your preferred storage
    const linkplaidCompleted = localStorage.getItem('linkplaidCompleted'); // Or your preferred storage
    console.log("surveyCompleted: " + surveyCompleted)
    console.log("linkplaidCompleted: " + linkplaidCompleted)
    if (surveyCompleted === 'true') {
      // Survey is done, navigate to the main app (e.g., first tab)
      // Check if already on a tabs path to avoid loop if user manually types /tabs/*
      if (linkplaidCompleted === 'true') {
        if (!this.router.url.startsWith('/survey')) { // Check if already on /survey to avoid loop
          this.router.navigateByUrl('/survey', { replaceUrl: true });
        }
      } else {
        if (!this.router.url.startsWith('/bank-link')) {
          this.router.navigateByUrl('/bank-link', { replaceUrl: true });
        }
      }      
    } else {
      // Survey not done, navigate to the survey page
      // Check if already on survey path to avoid loop
      if (this.router.url !== '/survey') {
        this.router.navigateByUrl('/survey', { replaceUrl: true });
      }
    }
  }

}