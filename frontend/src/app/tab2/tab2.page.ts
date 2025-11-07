import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonList,
  IonSegment,
  IonSegmentButton
} from '@ionic/angular/standalone';

interface SimulationResult {
  successProbability: number;
  medianEndValue: number;
  minimumEndValue: number;
  failureRate: number;
}

interface StrategyCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
  benefits: string[];
  considerations: string[];
  portfolioRecommendation: string;
  bestFor: string;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonInput,
    IonItem,
    IonLabel,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonSpinner,
    IonBadge,
    IonList,
    IonSegment,
    IonSegmentButton
  ]
})
export class Tab2Page {
  selectedSection: string = 'simulator';
  
  // Monte Carlo simulation inputs
  portfolioValue: number = 1000000;
  annualWithdrawal: number = 40000;
  yearsToLast: number = 30;
  
  // Simulation state
  isSimulating: boolean = false;
  simulationResult: SimulationResult | null = null;
  
  // Strategy education
  selectedCard: StrategyCard | null = null;
  
  strategyCards: StrategyCard[] = [
    {
      id: 'fixed-percentage',
      title: '4% Rule (Fixed Percentage)',
      subtitle: 'The classic retirement withdrawal strategy',
      icon: 'calculator-outline',
      color: 'primary',
      description: 'Withdraw 4% of your initial portfolio value each year, adjusted for inflation. This is the foundation of modern retirement planning.',
      benefits: [
        'Simple and predictable income',
        'Historically safe withdrawal rate',
        'Easy to implement and track',
        'Protects against sequence of returns risk',
        'Backed by extensive research (Trinity Study)'
      ],
      considerations: [
        'Inflexible during market downturns',
        'May leave significant money on the table',
        'Does not adapt to market conditions',
        'Conservative approach may limit lifestyle'
      ],
      portfolioRecommendation: 'Balanced portfolio: 60% stocks, 40% bonds for moderate growth with stability',
      bestFor: 'This strategy is for the person who values predictability and simplicity over optimization, and wants peace of mind knowing their plan is historically safe.'
    },
    {
      id: 'dynamic-spending',
      title: 'Dynamic Spending (Guardrails)',
      subtitle: 'Flexible withdrawals based on portfolio performance',
      icon: 'speedometer-outline',
      color: 'secondary',
      description: 'Adjust your spending up or down based on portfolio performance, using "guardrails" to trigger spending changes.',
      benefits: [
        'Adapts to market performance',
        'Higher initial withdrawal rates possible',
        'Reduces portfolio failure risk',
        'Potentially higher lifetime spending',
        'Responds to both good and bad markets'
      ],
      considerations: [
        'Variable income year to year',
        'Requires spending flexibility',
        'More complex to implement',
        'May reduce spending during recessions'
      ],
      portfolioRecommendation: 'Aggressive growth: 80% stocks, 20% bonds to maximize upside potential for spending increases',
      bestFor: 'This strategy is for the person who can adjust their lifestyle based on market performance and prioritizes maximizing total lifetime spending over predictable income.'
    },
    {
      id: 'bond-tent',
      title: 'Bond Tent (Glidepath)',
      subtitle: 'Gradually increase bonds as you age',
      icon: 'triangle-outline',
      color: 'tertiary',
      description: 'Start retirement with higher stock allocation, then gradually shift to bonds over time to reduce risk as you age.',
      benefits: [
        'Higher growth potential early in retirement',
        'Reduces sequence of returns risk',
        'Adapts risk to remaining time horizon',
        'Potential for higher withdrawal rates',
        'Automatic risk management'
      ],
      considerations: [
        'Complex rebalancing requirements',
        'May miss late-career market gains',
        'Requires discipline to follow plan',
        'Timing of shifts can impact results'
      ],
      portfolioRecommendation: 'Start at 90% stocks, 10% bonds, gradually move to 50% stocks, 50% bonds by age 80',
      bestFor: 'This strategy is for the person who wants to maximize early retirement growth while automatically becoming more conservative over time.'
    },
    {
      id: 'bucket-strategy',
      title: 'Bucket Strategy',
      subtitle: 'Time-based asset allocation for peace of mind',
      icon: 'layers-outline',
      color: 'warning',
      description: 'Divide your portfolio into three buckets: short-term cash, medium-term bonds, and long-term stocks based on when you need the money.',
      benefits: [
        'Provides psychological comfort',
        'Clear spending roadmap',
        'Protects against sequence risk',
        'Maintains long-term growth',
        'Easy to understand and visualize'
      ],
      considerations: [
        'May result in cash drag',
        'Complex rebalancing between buckets',
        'Opportunity cost of holding cash',
        'Requires ongoing bucket management'
      ],
      portfolioRecommendation: 'Bucket 1 (Years 1-5): 100% cash/CDs, Bucket 2 (Years 6-15): 100% bonds, Bucket 3 (Years 16+): 100% stocks',
      bestFor: 'This strategy is for the person who worries about market volatility and wants the security of knowing their next 5-10 years of expenses are safely set aside.'
    },
    {
      id: 'total-return',
      title: 'Total Return (Modern Portfolio)',
      subtitle: 'Harvest gains and rebalance for income',
      icon: 'refresh-outline',
      color: 'success',
      description: 'Maintain a diversified portfolio and harvest gains through rebalancing, selling high-performing assets to fund spending.',
      benefits: [
        'Tax-efficient through loss harvesting',
        'Maintains optimal asset allocation',
        'Flexible withdrawal timing',
        'Takes advantage of market volatility',
        'Modern institutional approach'
      ],
      considerations: [
        'Requires active portfolio management',
        'Complex tax considerations',
        'Need discipline to sell winners',
        'May have years with no natural income'
      ],
      portfolioRecommendation: 'Diversified portfolio: 70% total stock market, 30% total bond market with annual rebalancing',
      bestFor: 'This strategy is for the person who understands investing and wants to optimize their portfolio like an endowment fund, prioritizing long-term growth and tax efficiency.'
    },
    {
      id: 'floor-ceiling',
      title: 'Floor and Ceiling',
      subtitle: 'Essential needs covered, upside for wants',
      icon: 'bar-chart-outline',
      color: 'danger',
      description: 'Cover essential expenses with guaranteed income (Social Security, pensions, bonds), invest the rest aggressively for lifestyle expenses.',
      benefits: [
        'Guarantees essential needs are met',
        'Unlimited upside for lifestyle expenses',
        'Reduces anxiety about basic needs',
        'Allows aggressive investing for extras',
        'Clear priority-based spending'
      ],
      considerations: [
        'Requires careful expense categorization',
        'May limit early retirement lifestyle',
        'Complex to set up initially',
        'Lifestyle spending can be volatile'
      ],
      portfolioRecommendation: 'Floor: 100% bonds/annuities for essentials, Ceiling: 100% stocks for lifestyle spending',
      bestFor: 'This strategy is for the person who wants to guarantee their basic needs are covered no matter what, while still participating in market growth for discretionary spending.'
    },
    {
      id: 'sbloc-4percent',
      title: 'SBLOC-Enhanced 4% Rule',
      subtitle: 'Smart borrowing during market downturns',
      icon: 'card-outline',
      color: 'success',
      description: 'Follow the 4% rule but use a Securities-Based Line of Credit (SBLOC) to borrow during market downturns instead of selling assets, then pay off the loan when markets recover.',
      benefits: [
        'Avoid selling during market crashes',
        'Maintain full market exposure during downturns',
        'Potentially higher long-term returns',
        'Tax-efficient cash access',
        'Combines safety of 4% rule with flexibility',
        'Reduces sequence of returns risk'
      ],
      considerations: [
        'Interest costs on borrowed funds',
        'Margin call risk during severe downturns',
        'Requires credit approval and maintenance',
        'Complex to manage and monitor',
        'Not available to all investors'
      ],
      portfolioRecommendation: 'Balanced growth: 70% stocks, 30% bonds to maximize collateral value while maintaining stability for lending requirements',
      bestFor: 'This strategy is for the sophisticated investor who qualifies for SBLOC lending and wants to optimize the 4% rule by avoiding forced sales during market stress.'
    },
    {
      id: 'vanguard-dynamic',
      title: 'Vanguard Dynamic Spending',
      subtitle: 'Research-backed flexible withdrawal approach',
      icon: 'trending-up-outline',
      color: 'primary',
      description: 'Adjust your spending based on portfolio performance using Vanguard\'s research: spend more when your portfolio is up, cut back when it\'s down, within guardrails.',
      benefits: [
        'Backed by extensive research',
        'Higher average lifetime spending',
        'Reduces portfolio failure risk',
        'Adapts to market conditions automatically',
        'Can start with higher initial withdrawal rate',
        'Built-in downside protection'
      ],
      considerations: [
        'Income varies significantly year to year',
        'Requires lifestyle flexibility',
        'May cut spending during recessions',
        'Complex rules to follow',
        'Emotional difficulty cutting spending'
      ],
      portfolioRecommendation: 'Aggressive allocation: 80-90% stocks, 10-20% bonds to maximize upside potential for spending increases',
      bestFor: 'This strategy is for the flexible retiree who prioritizes maximizing lifetime spending over income predictability and can handle variable annual income.'
    },
    {
      id: 'bond-ladder',
      title: 'Bond Ladder Strategy',
      subtitle: 'Predictable income with maturity matching',
      icon: 'bar-chart-outline',
      color: 'secondary',
      description: 'Create a ladder of individual bonds or CDs that mature each year to provide predictable income, with remaining funds invested for growth.',
      benefits: [
        'Predictable annual income stream',
        'Protection from interest rate changes',
        'No reinvestment risk for laddered portion',
        'Clear spending roadmap',
        'Reduces sequence of returns risk',
        'Peace of mind with guaranteed income'
      ],
      considerations: [
        'Lower expected returns than stocks',
        'Inflation risk over long periods',
        'Opportunity cost of conservative allocation',
        'Complex to construct and manage',
        'May not keep up with rising costs'
      ],
      portfolioRecommendation: 'Hybrid approach: 40-50% bond ladder for 10-15 years of expenses, 50-60% growth investments for long-term needs',
      bestFor: 'This strategy is for the conservative retiree who prioritizes income certainty and wants to eliminate market risk for their near-term expenses.'
    },
    {
      id: 'retirement-income-optimizer',
      title: 'Retirement Income Optimizer',
      subtitle: 'Tax-efficient withdrawal sequencing',
      icon: 'calculator-outline',
      color: 'tertiary',
      description: 'Optimize withdrawal order from different account types (taxable, traditional IRA, Roth IRA) based on tax efficiency and required minimum distributions.',
      benefits: [
        'Minimizes lifetime tax burden',
        'Maximizes after-tax income',
        'Coordinates with Social Security strategy',
        'Accounts for RMD requirements',
        'Optimizes Roth conversion opportunities',
        'Professional-level tax planning'
      ],
      considerations: [
        'Complex tax calculations required',
        'Requires multiple account types',
        'Tax laws may change',
        'Needs annual review and adjustment',
        'May require professional guidance'
      ],
      portfolioRecommendation: 'Diversified across account types: Growth investments in Roth, balanced in traditional IRAs, tax-efficient funds in taxable accounts',
      bestFor: 'This strategy is for the tax-conscious retiree with significant assets across multiple account types who wants to minimize their lifetime tax burden.'
    }
  ];

  constructor() {}

  runSimulation() {
    this.isSimulating = true;
    
    // Simulate processing delay
    setTimeout(() => {
      this.simulationResult = this.runMonteCarloSimulation();
      this.isSimulating = false;
    }, 2000);
  }

  private runMonteCarloSimulation(): SimulationResult {
    const simulations = 1000;
    const years = this.yearsToLast;
    const inflationRate = 0.025;
    const stockReturn = 0.10;
    const stockVolatility = 0.18;
    const bondReturn = 0.04;
    const bondVolatility = 0.05;
    
    let successCount = 0;
    const endValues: number[] = [];
    
    for (let sim = 0; sim < simulations; sim++) {
      let portfolioVal = this.portfolioValue;
      let annualWithdrawal = this.annualWithdrawal;
      let success = true;
      
      for (let year = 0; year < years; year++) {
        // Generate random returns using Monte Carlo
        const stockRandomReturn = this.generateRandomReturn(stockReturn, stockVolatility);
        const bondRandomReturn = this.generateRandomReturn(bondReturn, bondVolatility);
        
        // Assume 70% stocks, 30% bonds balanced portfolio
        const portfolioReturn = 0.7 * stockRandomReturn + 0.3 * bondRandomReturn;
        
        // Apply market performance to portfolio
        portfolioVal *= (1 + portfolioReturn);
        
        // Adjust withdrawal for inflation
        annualWithdrawal *= (1 + inflationRate);
        
        // Withdraw from portfolio
        portfolioVal -= annualWithdrawal;
        
        // Check if portfolio is depleted
        if (portfolioVal <= 0) {
          success = false;
          break;
        }
      }
      
      if (success && portfolioVal > 0) {
        successCount++;
      }
      
      endValues.push(Math.max(0, portfolioVal));
    }
    
    endValues.sort((a, b) => a - b);
    
    return {
      successProbability: (successCount / simulations) * 100,
      medianEndValue: endValues[Math.floor(endValues.length / 2)],
      minimumEndValue: endValues[0],
      failureRate: ((simulations - successCount) / simulations) * 100
    };
  }

  private generateRandomReturn(meanReturn: number, volatility: number): number {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return meanReturn + volatility * z0;
  }

  getSuccessIcon(): string {
    if (!this.simulationResult) return 'help-outline';
    
    if (this.simulationResult.successProbability >= 90) return 'checkmark-circle-outline';
    if (this.simulationResult.successProbability >= 75) return 'warning-outline';
    return 'close-circle-outline';
  }

  getSuccessColor(): string {
    if (!this.simulationResult) return 'medium';
    
    if (this.simulationResult.successProbability >= 90) return 'success';
    if (this.simulationResult.successProbability >= 75) return 'warning';
    return 'danger';
  }

  getSuccessMessage(): string {
    if (!this.simulationResult) return 'No simulation run yet';
    
    if (this.simulationResult.successProbability >= 90) return 'Excellent Strategy';
    if (this.simulationResult.successProbability >= 75) return 'Good Strategy';
    if (this.simulationResult.successProbability >= 50) return 'Moderate Risk';
    return 'High Risk Strategy';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercent(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  selectCard(card: StrategyCard) {
    this.selectedCard = this.selectedCard?.id === card.id ? null : card;
  }

  getTotalWithdrawal(): number {
    // Calculate total withdrawal over retirement period with inflation
    let total = 0;
    let currentWithdrawal = this.annualWithdrawal;
    
    for (let year = 0; year < this.yearsToLast; year++) {
      total += currentWithdrawal;
      currentWithdrawal *= 1.025; // 2.5% inflation
    }
    
    return total;
  }

  getFinalYearWithdrawal(): number {
    // Calculate what the withdrawal will be in the final year
    return this.annualWithdrawal * Math.pow(1.025, this.yearsToLast - 1);
  }

  getSuccessfulScenarios(): number {
    // Calculate number of successful scenarios out of 1,000
    if (!this.simulationResult) return 0;
    return Math.round(this.simulationResult.successProbability * 10);
  }

  // Expose Math for template use
  get mathPow() {
    return Math.pow;
  }
}
