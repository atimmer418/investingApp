import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonProgressBar, IonTitle, IonContent, IonIcon, IonFooter, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons'; // Import for custom icons
import { star, trendingUp, shieldCheckmark, swapHorizontal, shield } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

// Define a type for our strategy for clean code
export interface StrategyTag {
  label: string;
  type: 'positive' | 'neutral' | 'caution'; // For color-coding
}

export interface Strategy {
  id: string;
  title: string;
  description: string;
  tags: StrategyTag[];
  icon: string; // Add icon property
}

@Component({
  selector: 'app-fi-plan-results',
  templateUrl: './fi-plan-results.component.html',
  styleUrls: ['./fi-plan-results.component.scss'],
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonProgressBar, IonTitle, IonContent, IonIcon, IonFooter, IonButton],
})
export class FiPlanResultsComponent implements OnInit, OnDestroy {

  strategies: Strategy[] = [
    {
      id: 'optimal',
      title: 'Optimal Growth',
      description: 'Withdraw from your portfolio and use a line of credit in down years to protect and grow your wealth.',
      icon: 'trending-up',
      tags: [
        { label: 'Highest Growth', type: 'positive' },
        { label: 'Volatility Mitigation', type: 'positive' },
        { label: 'App-Managed', type: 'neutral' }
      ]
    },
    {
      id: 'balanced',
      title: 'Balanced Security',
      description: 'Guarantee your essential income with an annuity and invest the rest for growth and lifestyle spending.',
      icon: 'shield-checkmark',
      tags: [
        { label: 'Good Growth', type: 'positive' },
        { label: 'Essentials Guaranteed', type: 'positive' },
        { label: 'Less Flexible', type: 'caution' }
      ]
    },
    {
      id: 'adaptive',
      title: 'Adaptive Spending',
      description: 'Withdraw from your portfolio using smart guardrails, adapting your spending to the market.',
      icon: 'swap-horizontal',
      tags: [
        { label: 'High Growth', type: 'positive' },
        { label: 'No Debt Ever', type: 'positive' },
        { label: 'Lifestyle Fluctuates', type: 'caution' }
      ]
    },
    {
      id: 'safety',
      title: 'Safety First',
      description: 'Convert your portfolio into a guaranteed paycheck for life with an annuity. No market risk.',
      icon: 'shield',
      tags: [
        { label: 'Guaranteed Income', type: 'positive' },
        { label: 'Set & Forget', type: 'positive' },
        { label: 'No Market Growth', type: 'caution' }
      ]
    }
  ];

  timeToFI: string = '';
  targetPortfolio: number = 0;
  retirementIncome: number = 0;
  monthlyInvestment: number = 0;
  selectedStrategyId: string = 'optimal';
  
  private routeSub: Subscription | undefined;
  
  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService, private cdr: ChangeDetectorRef) {
    addIcons({ star, trendingUp, shieldCheckmark, swapHorizontal, shield });
  }

  ngOnInit() {
    // Make component accessible from browser console for debugging
    (window as any)['fiPlanComponent'] = this;
    
    // Mark this step as incomplete when user enters/returns to this page
    this.authService.markStepIncomplete('fiPlanResults').subscribe({
      next: () => console.log('FiPlanResults step marked as incomplete'),
      error: (err) => console.log('FiPlanResults step could not be marked incomplete (likely not authenticated yet):', err)
    });
    
    this.routeSub = this.route.queryParams.subscribe(params => {
      // First try to get values from query parameters (fresh navigation from surveyInitial)
      this.timeToFI = params['t'];
      this.retirementIncome = +params['rI'];
      this.monthlyInvestment = +params['mI'];
      
      // If query parameters are missing, try to get from user progress or localStorage
      if (!this.timeToFI || !this.retirementIncome || !this.monthlyInvestment) {
        console.log('Query parameters missing, trying to load from saved data');
        this.loadSavedData();
      }
      
      // Calculate target portfolio based on retirement income
      if (this.retirementIncome) {
        this.targetPortfolio = this.retirementIncome / 0.04;
      }
      
      console.log('FiPlanResults loaded with data:', {
        timeToFI: this.timeToFI,
        retirementIncome: this.retirementIncome,
        monthlyInvestment: this.monthlyInvestment,
        targetPortfolio: this.targetPortfolio,
        selectedStrategy: this.selectedStrategyId
      });
    });
    
    // Load strategy selection FIRST, before saving any data
    setTimeout(() => {
      this.loadSelectedStrategy();
      
      // Only save data after strategy is loaded to avoid overwriting the selection
      if (this.timeToFI && this.retirementIncome && this.monthlyInvestment) {
        setTimeout(() => {
          this.saveDataToLocalStorage();
        }, 50);
      }
    }, 100);
  }
  
  private loadSelectedStrategy() {
    const savedStrategy = localStorage.getItem('fiPlanSelectedStrategy');
    console.log('Loading strategy from localStorage:', savedStrategy);
    console.log('Current selectedStrategyId before loading:', this.selectedStrategyId);
    
    if (savedStrategy && savedStrategy !== this.selectedStrategyId) {
      this.selectedStrategyId = savedStrategy;
      console.log('Updated selectedStrategyId to:', this.selectedStrategyId);
      
      // Trigger change detection to update the view
      this.cdr.detectChanges();
      console.log('Change detection triggered');
    } else if (savedStrategy) {
      console.log('Saved strategy matches current selection, no change needed');
    } else {
      console.log('No saved strategy found, using default:', this.selectedStrategyId);
    }
    
    // Double-check what's actually in localStorage and component
    console.log('Final state - localStorage:', localStorage.getItem('fiPlanSelectedStrategy'));
    console.log('Final state - component selectedStrategyId:', this.selectedStrategyId);
    
    // Verify the DOM will show the correct selection
    setTimeout(() => {
      const selectedElements = document.querySelectorAll('.strategy-card.selected');
      console.log('DOM elements with selected class:', selectedElements.length);
      if (selectedElements.length > 0) {
        console.log('Selected strategy in DOM:', selectedElements[0].getAttribute('data-strategy') || 'unknown');
      }
    }, 100);
  }
  
  private loadSavedData() {
    // Try to get from user progress first (for authenticated users)
    this.authService.userProgress$.subscribe(progress => {
      if (progress) {
        if (progress.monthlyInvestment && !this.monthlyInvestment) {
          this.monthlyInvestment = progress.monthlyInvestment;
        }
        if (progress.retirementIncome && !this.retirementIncome) {
          this.retirementIncome = progress.retirementIncome;
        }
      }
    });
    
    // Calculate timeToFI from the saved values
    if (this.monthlyInvestment && this.retirementIncome) {
      this.timeToFI = this.calculateTimeToFI(this.monthlyInvestment, this.retirementIncome);
    }
    
    // Fallback to localStorage if user progress doesn't have the data
    if (!this.timeToFI) {
      this.timeToFI = localStorage.getItem('fiPlanTimeToFI') || '';
    }
    if (!this.retirementIncome) {
      const savedRetirement = localStorage.getItem('surveyRetirementIncome');
      this.retirementIncome = savedRetirement ? parseInt(savedRetirement, 10) : 0;
    }
    if (!this.monthlyInvestment) {
      const savedMonthly = localStorage.getItem('surveyMonthlyInvestment');
      this.monthlyInvestment = savedMonthly ? parseInt(savedMonthly, 10) : 0;
    }
  }
  
  private saveDataToLocalStorage() {
    localStorage.setItem('fiPlanTimeToFI', this.timeToFI);
    localStorage.setItem('fiPlanTargetPortfolio', this.targetPortfolio.toString());
    
    // Only save strategy if it's not the default, or if there's no existing strategy saved
    const existingStrategy = localStorage.getItem('fiPlanSelectedStrategy');
    if (!existingStrategy || this.selectedStrategyId !== 'optimal') {
      localStorage.setItem('fiPlanSelectedStrategy', this.selectedStrategyId);
    }
    
    console.log('FiPlanResults: Saved data to localStorage:', {
      timeToFI: this.timeToFI,
      targetPortfolio: this.targetPortfolio,
      selectedStrategy: localStorage.getItem('fiPlanSelectedStrategy'), // Show what's actually saved
      skippedStrategyOverwrite: existingStrategy && this.selectedStrategyId === 'optimal'
    });
  }
  
  private calculateTimeToFI(monthlyInvestment: number, retirementIncome: number): string {
    const targetPortfolio = retirementIncome / 0.04;
    const monthlyRate = 0.10 / 12; // 10% annual return
    
    if (monthlyInvestment <= 0) {
      return '∞';
    }
    
    const numberOfMonths = Math.log((targetPortfolio * monthlyRate / monthlyInvestment) + 1) / Math.log(1 + monthlyRate);
    const years = numberOfMonths / 12;
    
    return isFinite(years) ? years.toFixed(1) : '∞';
  }
  
  selectStrategy(id: string) {
    console.log('selectStrategy called with id:', id);
    console.log('Previous selectedStrategyId:', this.selectedStrategyId);
    
    this.selectedStrategyId = id;
    console.log('Updated selectedStrategyId to:', this.selectedStrategyId);
    
    // Save selection to localStorage immediately
    localStorage.setItem('fiPlanSelectedStrategy', id);
    console.log('Saved to localStorage:', localStorage.getItem('fiPlanSelectedStrategy'));
    
    // Trigger change detection to ensure view updates
    this.cdr.detectChanges();
    console.log('Change detection triggered after selection');
    
    // Verify the change in the DOM
    setTimeout(() => {
      const selectedElements = document.querySelectorAll('.strategy-card.selected');
      console.log('After selection - DOM elements with selected class:', selectedElements.length);
      selectedElements.forEach((el, index) => {
        console.log(`Selected element ${index}:`, el.getAttribute('data-strategy'));
      });
    }, 50);
  }

  getSelectedStrategyName(): string {
    return this.strategies.find(s => s.id === this.selectedStrategyId)?.title || 'Strategy';
  }

  getFutureYear(): number {
    const currentYear = new Date().getFullYear();
    const yearsToAdd = parseFloat(this.timeToFI) || 0;
    return currentYear + Math.round(yearsToAdd);
  }
  
  confirmSelection() {
    console.log(`User selected the ${this.getSelectedStrategyName()} plan.`);
    
    // Complete the fiPlanResults step
    this.authService.completeStep('fiPlanResults').subscribe({
      next: () => {
        console.log('FiPlanResults step completed successfully');
        this.router.navigate(['/auth-finalize'], { 
          queryParams: { 
            plan: this.selectedStrategyId,
            t: this.timeToFI,
            p: this.targetPortfolio,
            rI: this.retirementIncome,
            mI: this.monthlyInvestment
          } 
        });
      },
      error: (err) => {
        console.log('FiPlanResults step could not be completed (likely not authenticated yet):', err);
        // Still navigate even if progress update fails
        this.router.navigate(['/auth-finalize'], { 
          queryParams: { 
            plan: this.selectedStrategyId,
            t: this.timeToFI,
            p: this.targetPortfolio,
            rI: this.retirementIncome,
            mI: this.monthlyInvestment
          } 
        });
      }
    });
  }
  
  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
  }
  
  // Debug method - call from browser console: window['fiPlanComponent'].testSelectStrategy('balanced')
  testSelectStrategy(id: string) {
    console.log('=== MANUAL TEST: Selecting strategy', id, '===');
    this.selectStrategy(id);
    console.log('=== MANUAL TEST COMPLETE ===');
  }
  
  // Debug method for template
  debugCardClick(id: string) {
    console.log('Card clicked (mousedown):', id);
  }
}