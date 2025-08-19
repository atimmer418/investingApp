import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonProgressBar, IonTitle, IonContent, IonIcon, IonFooter, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons'; // Import for custom icons
import { star, trendingUp, shieldCheckmark, swapHorizontal, shield } from 'ionicons/icons';
import { Subscription } from 'rxjs';

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
  imports: [CommonModule, CurrencyPipe, IonHeader, IonToolbar, IonButtons, IonBackButton, IonProgressBar, IonTitle, IonContent, IonIcon, IonFooter, IonButton],
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
  
  constructor(private route: ActivatedRoute, private router: Router) {
    addIcons({ star, trendingUp, shieldCheckmark, swapHorizontal, shield });
  }

  ngOnInit() {
    this.routeSub = this.route.queryParams.subscribe(params => {
      this.timeToFI = params['t'] || 'N/A';
      this.retirementIncome = +params['rI'];
      this.targetPortfolio = this.retirementIncome / 0.04;
      this.monthlyInvestment = +params['mI'];
    });
  }
  
  selectStrategy(id: string) {
    this.selectedStrategyId = id;
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
  
  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
  }
}