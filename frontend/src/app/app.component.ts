// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular/standalone'; // Import Platform
import { SplashScreen } from '@capacitor/splash-screen'; // Import SplashScreen

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule], // Added Platform to imports
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    private platform: Platform // Inject Platform
  ) {
    this.initializeApp(); // Call initializeApp from constructor
  }

  initializeApp() {
    this.platform.ready().then(async () => {
      console.log('[AppComponent] Platform ready.');
      // Hide the native splash screen once the platform is ready and Angular is bootstrapping
      if (this.platform.is('capacitor')) {
        try {
          await SplashScreen.hide();
          console.log('[AppComponent] Splash screen hidden.');
        } catch (error) {
          console.error('[AppComponent] Error hiding splash screen:', error);
        }
      }
    });
  }

  ngOnInit(): void {
    // --- Test Scenarios (Uncomment ONE block at a time to test a flow) ---
    // (Your existing test scenarios for localStorage - keep them as they are useful)
    // Scenario 1: Fresh Start
    localStorage.clear();
    localStorage.setItem('initialSurveyCompleted', 'false');
    localStorage.setItem('linkplaidCompleted', 'false');
    localStorage.setItem('investmentSurveyCompleted', 'false');
    localStorage.setItem('choseToPickStocks', 'false');
    localStorage.setItem('stockSelectionCompleted', 'false');
    localStorage.setItem('investmentConfirmationCompleted', 'false');
    // --- End Test Scenarios ---

    console.log('[AppComponent] ngOnInit - Calling checkSurveyStatusAndNavigate.');
    this.checkSurveyStatusAndNavigate();
  }

  checkSurveyStatusAndNavigate(): void {
    const initialSurveyCompleted = localStorage.getItem('initialSurveyCompleted') === 'true';
    const linkplaidCompleted = localStorage.getItem('linkplaidCompleted') === 'true';
    const investmentSurveyCompleted = localStorage.getItem('investmentSurveyCompleted') === 'true';
    const choseToPickStocks = localStorage.getItem('choseToPickStocks') === 'true';
    const stockSelectionActualCompletion = localStorage.getItem('stockSelectionCompleted') === 'true';
    const investmentConfirmationCompleted = localStorage.getItem('investmentConfirmationCompleted') === 'true';

    console.log("------------------------------------------");
    console.log("[AppComponent] checkSurveyStatusAndNavigate CALLED");
    console.log("  Current Router URL:", this.router.url);
    console.log("  FLAGS FROM LOCALSTORAGE:");
    console.log("    initialSurveyCompleted:", initialSurveyCompleted);
    console.log("    linkplaidCompleted:", linkplaidCompleted);
    console.log("    investmentSurveyCompleted:", investmentSurveyCompleted);
    console.log("    choseToPickStocks:", choseToPickStocks);
    console.log("    stockSelectionActualCompletion:", stockSelectionActualCompletion);
    console.log("    investmentConfirmationCompleted:", investmentConfirmationCompleted);
    console.log("------------------------------------------");

    let targetRoute: string | null = null;
    let decisionReason: string = "";

    if (!initialSurveyCompleted) {
      targetRoute = '/survey';
      decisionReason = "Initial survey NOT complete.";
    } else if (!linkplaidCompleted) {
      targetRoute = '/link-bank';
      decisionReason = "Initial survey complete, Plaid linking NOT complete.";
    } else if (!investmentSurveyCompleted) {
      targetRoute = '/survey';
      decisionReason = "Plaid linked, Investment setup survey NOT complete.";
    } else if (choseToPickStocks && !stockSelectionActualCompletion) {
      targetRoute = '/stock-selection';
      decisionReason = "User chose to pick stocks, but stock selection page NOT complete.";
    } else if (!investmentConfirmationCompleted) {
      targetRoute = '/confirm-investment';
      decisionReason = "Investment process (auto or custom picks defined) done, Investment confirmation NOT complete.";
    } else {
      targetRoute = '/tabs/tab1';
      decisionReason = "All onboarding steps complete.";
    }

    const currentBaseUrl = this.router.url.split('?')[0].split('#')[0];
    if (targetRoute && currentBaseUrl !== targetRoute) {
      console.log(`[AppComponent] DECISION: ${decisionReason} Navigating to ${targetRoute}.`);
      this.router.navigateByUrl(targetRoute, { replaceUrl: true });
    } else if (targetRoute && currentBaseUrl === targetRoute) {
      console.log(`[AppComponent] DECISION: ${decisionReason} Already on target route ${targetRoute}. No navigation needed.`);
    } else {
      console.log(`[AppComponent] No specific navigation target determined or already on target. Current URL: ${this.router.url}`);
    }
  }
}