// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common'; // CommonModule is needed if your app.component.html uses *ngIf etc.
                                             // For just <ion-app><ion-router-outlet></ion-router-outlet>, it's not strictly required
                                             // but good to have if you add to the template later.

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule], // IonApp and IonRouterOutlet are key
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {

    // remove these later
    localStorage.setItem('initialSurveyCompleted', 'false')
    localStorage.setItem('linkplaidCompleted', 'false')
    localStorage.setItem('investmentSurveyCompleted', 'false')
    // remove these later

    console.log('[AppComponent] ngOnInit - Calling checkSurveyStatusAndNavigate.');
    this.checkSurveyStatusAndNavigate(); // Now we call the actual logic
  }

  checkSurveyStatusAndNavigate(): void {
    // It's good practice to read these fresh each time the method is called
    const initialSurveyCompleted = localStorage.getItem('initialSurveyCompleted') === 'true';
    const linkplaidCompleted = localStorage.getItem('linkplaidCompleted') === 'true';
    const investmentSurveyCompleted = localStorage.getItem('investmentSurveyCompleted') === 'true';

    // More granular console logs to trace the decision path
    console.log("------------------------------------------");
    console.log("[AppComponent] checkSurveyStatusAndNavigate CALLED");
    console.log("  Current Router URL:", this.router.url); // Log current URL before navigation attempt
    console.log("  FLAGS FROM LOCALSTORAGE:");
    console.log("    initialSurveyCompleted:", initialSurveyCompleted);
    console.log("    linkplaidCompleted:", linkplaidCompleted);
    console.log("    investmentSurveyCompleted:", investmentSurveyCompleted);
    console.log("------------------------------------------");


    // Condition 1: All onboarding steps are fully completed
    if (initialSurveyCompleted && linkplaidCompleted && investmentSurveyCompleted) {
      if (!this.router.url.startsWith('/tabs')) {
        console.log('[AppComponent] DECISION: All onboarding complete. Navigating to /tabs/tab1.');
        this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
      } else {
        console.log('[AppComponent] DECISION: All onboarding complete. Already on a tabs page.');
      }
    }
    // Condition 2: Initial survey is done, but Plaid linking is NOT done
    else if (initialSurveyCompleted && !linkplaidCompleted) {
      if (this.router.url !== '/link-bank') { // Check current URL to prevent loop
        console.log('[AppComponent] DECISION: Initial survey done, Plaid NOT linked. Navigating to /link-bank.');
        this.router.navigateByUrl('/link-bank', { replaceUrl: true });
      } else {
        console.log('[AppComponent] DECISION: Initial survey done, Plaid NOT linked. Already on /link-bank.');
      }
    }
    // Condition 3: Initial survey is done, Plaid linking IS done, but investment survey is NOT done
    // This means we need to show the survey page again, which will then load the investment questions.
    else if (initialSurveyCompleted && linkplaidCompleted && !investmentSurveyCompleted) {
      if (!this.router.url.startsWith('/survey')) { // Check current URL to prevent loop
        console.log('[AppComponent] DECISION: Plaid linked, investment survey NOT done. Navigating to /survey.');
        this.router.navigateByUrl('/survey', { replaceUrl: true });
      } else {
        console.log('[AppComponent] DECISION: Plaid linked, investment survey NOT done. Already on /survey.');
      }
    }
    // Condition 4: Initial survey is NOT done (this is the very first step)
    else { // This covers !initialSurveyCompleted
      if (!this.router.url.startsWith('/survey')) { // Check current URL to prevent loop
        console.log('[AppComponent] DECISION: Initial survey NOT done. Navigating to /survey.');
        this.router.navigateByUrl('/survey', { replaceUrl: true });
      } else {
        console.log('[AppComponent] DECISION: Initial survey NOT done. Already on /survey.');
      }
    }
  }
}