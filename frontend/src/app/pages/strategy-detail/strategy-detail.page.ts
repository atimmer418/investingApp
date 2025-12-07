import { Component, OnInit, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonProgressBar
} from '@ionic/angular/standalone';
import { register } from 'swiper/element/bundle';

interface StrategyContent {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  tagline: string;
  overview: string;
  howItWorks: {
    title: string;
    steps: string[];
  };
  vsTraditional: {
    title: string;
    sbloc: string[];
    traditional: string[];
    conclusion: string;
  };
  benefits: string[];
  considerations: string[];
  monteCarloExplanation?: {
    title: string;
    overview: string;
    steps: string[];
    successRate: string;
  };
  exampleScenario: {
    title: string;
    description: string;
    details: string[];
  };
  bestFor: string;
  gettingStarted: string[];
}

@Component({
  selector: 'app-strategy-detail',
  templateUrl: './strategy-detail.page.html',
  styleUrls: ['./strategy-detail.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonProgressBar,
    CommonModule,
    FormsModule
  ]
})
export class StrategyDetailPage implements OnInit {
  strategyId: string = '';
  strategy: StrategyContent | null = null;
  currentSlide: number = 0;
  totalSlides: number = 6;

  private strategies: { [key: string]: StrategyContent } = {
    'sbloc': {
      id: 'sbloc',
      title: 'Optimal Growth Strategy',
      subtitle: 'SBLOC (Securities-Based Line of Credit)',
      icon: 'trending-up',
      color: 'primary',
      tagline: 'Maximize portfolio longevity by avoiding forced sales during market downturns',
      overview: 'Think of this like borrowing against your house when you need cash, instead of selling it. When the stock market drops, instead of selling your investments at a loss, you borrow money using them as collateral (similar to a home equity line of credit). When the market recovers, you pay back what you borrowed. This way, you never have to sell when prices are low—you only sell when prices are high.',
      howItWorks: {
        title: 'How the SBLOC Strategy Works',
        steps: [
          'During market upturns (positive years), withdraw your annual expenses directly from your portfolio by selling assets at favorable prices.',
          'During market downturns (negative years), instead of selling, borrow your annual expenses using your SBLOC. Your portfolio remains fully invested.',
          'When markets recover and return >12% in a year, perform a "True-Up": sell enough assets to pay off accumulated SBLOC interest.',
          'Monitor your Loan-to-Value (LTV) ratio to ensure it stays below 70%. This prevents margin calls and keeps you in control.',
          'Repeat this cycle throughout retirement, only selling high and borrowing low—the mathematically optimal approach.'
        ]
      },
      vsTraditional: {
        title: 'SBLOC vs. Traditional Withdrawals',
        sbloc: [
          'You avoid selling assets during downturns, allowing your portfolio to recover fully',
          'Reduces sequence of returns risk—the #1 threat to retirement portfolios',
          'Only sell high, borrow low—mathematically optimal',
          'Portfolio lasts significantly longer, potentially indefinitely'
        ],
        traditional: [
          'You sometimes sell when markets are down, locking in losses',
          'Reduced portfolio ability to recover from downturns',
          'Sequence risk can devastate early-retirement portfolios',
          'Standard 4% rule assumes ~30 years of longevity'
        ],
        conclusion: 'With SBLOC (assuming no margin calls and True-Up discipline), your portfolio will almost always last longer—sometimes indefinitely—compared to traditional withdrawals.'
      },
      benefits: [
        'Eliminates forced asset sales during market downturns',
        'Dramatically reduces sequence of returns risk',
        'Portfolio has better chance to recover and compound',
        'Tax-efficient: interest may be tax-deductible',
        'Maintains full market exposure during downturns',
        'Mathematically superior to traditional withdrawals',
        'Can potentially last indefinitely with average returns'
      ],
      considerations: [
        'Requires access to SBLOC (not all investors qualify)',
        'Interest costs on borrowed funds (typically 2-4%)',
        'Must monitor LTV ratio to avoid margin calls',
        'Requires discipline to pay off debt during up years',
        'More complex to manage than simple withdrawals',
        'Need emergency liquidity buffer for extreme scenarios'
      ],
      exampleScenario: {
        title: 'Real Example: $3M Portfolio',
        description: 'See how SBLOC protects your retirement',
        details: [
          '<strong>Portfolio</strong>: $3,000,000 (70% stocks, 30% bonds)',
          '<strong>Annual Withdrawal</strong>: $120,000 (4% rule, inflation-adjusted)',
          '<strong>Traditional Approach</strong>: ~30 years with good sequence, less with bad early returns',
          '<strong>SBLOC Approach</strong>: Significantly longer, potentially indefinite',
          '<strong>Key Difference</strong>: During 2008-2009 crash (-37% S&P 500), traditional approach forces you to sell $120k of crashed assets. SBLOC lets you borrow $120k, keeping your $3M fully invested to recover by 2010.',
          '<strong>Result</strong>: Your portfolio rebounds fully in the SBLOC scenario. In the traditional scenario, you locked in losses and never full recovered.'
        ]
      },
      bestFor: 'This strategy is for sophisticated investors who qualify for SBLOC lending and want to optimize retirement withdrawals scientifically. Best for those with $1M+ portfolios who value maximizing portfolio longevity and can handle slightly more complexity.',
      gettingStarted: [
        'Ensure you qualify for SBLOC with your brokerage (typically $100k+ in securities)',
        'Set up a Securities-Based Line of Credit with your broker (Fidelity, Schwab, Interactive Brokers, etc.)',
        'Establish your annual withdrawal amount (start with 4% of portfolio)',
        'Create a spreadsheet to track LTV ratio monthly',
        'Set calendar reminders to check for True-Up opportunities (market > +12%)',
        'Maintain 2-3 years of cash reserves as emergency buffer',
        'Review and rebalance annually'
      ]
    },
    'annuity-growth': {
      id: 'annuity-growth',
      title: 'Balanced Security Strategy',
      subtitle: 'Annuity + Growth Portfolio',
      icon: 'shield-checkmark',
      color: 'success',
      tagline: 'Guarantee your essential expenses while keeping growth potential',
      overview: 'Think of this like having both social security AND a 401(k). You use part of your nest egg to buy an annuity that covers your basic living expenses (rent, food, utilities) with guaranteed monthly payments for life. The rest stays invested in the market for growth. If the market crashes, you are fine—your bills are covered. If the market soars, you benefit from the gains. It is the best of both worlds: security meets opportunity.',
      howItWorks: {
        title: 'How Annuity + Growth Works',
        steps: [
          'Calculate your essential annual expenses (housing, food, healthcare, utilities). Let\'s say it\'s $50,000/year.',
          'Use a portion of your portfolio to purchase a guaranteed lifetime income annuity that pays $50,000/year (inflation-adjusted if possible).',
          'Invest the remaining portfolio in a diversified stock/bond portfolio for growth potential.',
          'Your annuity covers all essential expenses automatically every month—guaranteed, regardless of market conditions.',
          'Withdraw from your growth portfolio only for discretionary spending (travel, gifts, luxuries). If markets are down, simply cut back on extras.'
        ]
      },
      vsTraditional: {
        title: 'Annuity + Growth vs. Portfolio-Only',
        sbloc: [
          'Essential expenses are guaranteed for life—no market risk',
          'You can take more risk with remaining portfolio since basics are covered',
          'Sleep better knowing you can\'t outlive your income',
          'Flexibility to reduce discretionary spending in down markets'
        ],
        traditional: [
          'All expenses depend on portfolio performance',
          'Must be conservative with entire portfolio to avoid running out',
          'Market crashes can force difficult lifestyle cuts',
          'Constant worry about sequence of returns risk'
        ],
        conclusion: 'By guaranteeing your essentials with an annuity, you eliminate the fear of running out of money while still participating in market growth. You get peace of mind AND upside potential.'
      },
      benefits: [
        'Guaranteed lifetime income for essential expenses',
        'Eliminate worry about outliving your money',
        'Can take more risk with growth portfolio (essentials are safe)',
        'Simplifies retirement planning—know your floor',
        'Protection against cognitive decline (annuity runs on autopilot)',
        'Can spend growth portfolio more freely',
        'Inflation protection available with COLA annuities'
      ],
      considerations: [
        'Annuities are irreversible—money is locked up',
        'Lower liquidity for emergencies',
        'Annuity portion doesn\'t benefit from market upside',
        'Inflation can erode purchasing power (unless you buy COLA)',
        'No inheritance for annuitized portion',
        'Requires significant upfront capital',
        'Fees can be high—shop around for best rates'
      ],
      exampleScenario: {
        title: 'Real Example: $2M Portfolio',
        description: 'See how Annuity + Growth provides security and growth',
        details: [
          '<strong>Portfolio</strong>: $2,000,000 at age 65',
          '<strong>Essential Expenses</strong>: $60,000/year (housing, food, healthcare, utilities)',
          '<strong>Solution</strong>: Buy $1M lifetime annuity → guaranteed $60k/year for life',
          '<strong>Remaining Portfolio</strong>: $1,000,000 stays invested (70% stocks, 30% bonds)',
          '<strong>Discretionary Spending</strong>: Withdraw 4% ($40k/year) from growth portfolio for travel, dining, gifts',
          '<strong>In Good Markets</strong>: Enjoy $100k/year spending ($60k essentials + $40k extras)',
          '<strong>In Bad Markets</strong>: Cut extras to $20k or $0—essentials still covered by annuity',
          '<strong>Age 85 Result</strong>: Annuity paid $1.2M in guaranteed income. Growth portfolio grew to $1.8M despite some withdrawals.'
        ]
      },
      bestFor: 'This strategy is perfect for retirees who value peace of mind and want to guarantee their basic lifestyle. Best for those with $1M+ who can afford to lock up a portion for lifetime income while leaving the rest for growth and legacy.',
      gettingStarted: [
        'List your essential monthly expenses (housing, food, utilities, insurance, healthcare)',
        'Multiply by 12 and add 20% buffer—this is your annual income need from the annuity',
        'Shop for quotes from at least 3 annuity providers (use an independent broker)',
        'Consider COLA (cost-of-living adjustment) annuities to protect against inflation',
        'Purchase the annuity with portion of portfolio that covers your essential income',
        'Invest remaining portfolio in age-appropriate diversified allocation (e.g., 60/40)',
        'Set up automatic withdrawals from growth portfolio for discretionary spending',
        'Review discretionary spending annually—cut back in down markets if needed'
      ]
    },
    'dynamic-guardrails': {
      id: 'dynamic-guardrails',
      title: 'Flexible Spending Strategy',
      subtitle: 'Dynamic Guardrails (Guyton-Klinger)',
      icon: 'speedometer',
      color: 'warning',
      tagline: 'Spend more in good years, less in bad years—stay on track automatically',
      overview: 'Think of this like cruise control with lane assist for your car. You start with a target withdrawal rate (like 5%), but the strategy automatically adjusts your spending up or down based on how your portfolio is doing. If markets are strong and your portfolio grows, you spend more (upper guardrail). If markets decline, you spend less (lower guardrail). It is like having a smart financial advisor that keeps you from going too fast downhill or too slow uphill.',
      howItWorks: {
        title: 'How Dynamic Guardrails Work',
        steps: [
          'Start with an initial withdrawal rate (e.g., 5% of your portfolio in year 1).',
          'Set upper and lower guardrails around your withdrawal rate (e.g., 4% lower guardrail, 6% upper guardrail).',
          'Each year, check if your actual withdrawal rate (based on current portfolio value) hits either guardrail.',
          'If your withdrawal rate drops below the lower guardrail (portfolio grew significantly), INCREASE your spending by 10%.',
          'If your withdrawal rate rises above the upper guardrail (portfolio declined significantly), DECREASE your spending by 10%.',
          'Between the guardrails, keep your withdrawal the same as last year, adjusted for inflation.'
        ]
      },
      vsTraditional: {
        title: 'Dynamic Guardrails vs. Fixed 4% Rule',
        sbloc: [
          'Spending adjusts automatically based on portfolio performance',
          'Significantly reduces risk of running out of money',
          'Allows higher initial withdrawal rate (5% vs 4%)',
          'More responsive to market conditions'
        ],
        traditional: [
          'Fixed 4% withdrawal regardless of market conditions',
          'May force you to deplete assets in bad sequences',
          'Lower initial withdrawal for safety margin',
          'Same spending whether portfolio soars or crashes'
        ],
        conclusion: 'Dynamic Guardrails let you safely withdraw more in retirement by giving you flexibility. When times are good, you enjoy it. When times are tough, you tighten the belt. This adaptability makes your money last significantly longer.'
      },
      benefits: [
        'Higher safe withdrawal rate than traditional 4% rule',
        'Dramatically reduces chance of portfolio depletion',
        'Automatic adjustments—no guesswork',
        'Participate in market upside with increased spending',
        'Protects against sequence risk with spending cuts',
        'Simple rules-based approach',
        'Allows you to enjoy wealth when markets are strong'
      ],
      considerations: [
        'Requires flexibility in lifestyle spending',
        'Income can vary up or down by 10% periodically',
        'May be difficult if you have fixed expenses',
        'Psychologically challenging to cut spending in down years',
        'Requires annual recalculation',
        'Not ideal for those who need predictable income',
        'Works best with discretionary spending budget'
      ],
      exampleScenario: {
        title: 'Real Example: $1.5M Portfolio',
        description: 'See how Dynamic Guardrails adapt to markets',
        details: [
          '<strong>Starting Portfolio</strong>: $1,500,000 at age 65',
          '<strong>Initial Withdrawal</strong>: 5% = $75,000 in Year 1',
          '<strong>Guardrails</strong>: Lower at 4%, Upper at 6%',
          '<strong>Year 5 Scenario (Good Market)</strong>: Portfolio grows to $1,800,000. Current withdrawal rate: $75k / $1.8M = 4.2%. Below lower guardrail! Increase spending 10% to $82,500.',
          '<strong>Year 10 Scenario (Bad Market)</strong>: Portfolio drops to $1,200,000. Current withdrawal rate: $82.5k / $1.2M = 6.9%. Above upper guardrail! Decrease spending 10% to $74,250.',
          '<strong>Year 20 Result</strong>: Portfolio value $1,600,000, annual spending $80,000. Dynamic adjustments kept you on track through multiple market cycles.',
          '<strong>Fixed 4% Comparison</strong>: Would have withdrawn only $60k/year every year, leaving money on the table in good years.'
        ]
      },
      bestFor: 'This strategy is perfect for flexible retirees who can adjust their discretionary spending and want to maximize their withdrawal rate safely. Best for those with variable expenses (travel, hobbies, gifts) rather than fixed obligations.',
      gettingStarted: [
        'Calculate your current portfolio value',
        'Determine your initial withdrawal rate (typically 5% for age 65)',
        'Set your guardrails (common: 4% lower, 6% upper)',
        'Create a spreadsheet to track your withdrawal rate each year',
        'Each January, calculate: (Last year withdrawal) / (Current portfolio value)',
        'Compare to guardrails and adjust if needed (increase or decrease by 10%)',
        'Identify discretionary expenses you can cut if needed (travel, dining, gifts)',
        'Set calendar reminder to review annually'
      ]
    },
    'full-annuity': {
      id: 'full-annuity',
      title: 'Maximum Security Strategy',
      subtitle: 'Full Portfolio Annuitization',
      icon: 'lock-closed',
      color: 'danger',
      tagline: 'Convert your entire portfolio into guaranteed lifetime income—never worry again',
      overview: 'Think of this like trading your entire 401(k) for a permanent pension. You give your entire retirement savings to an insurance company, and they pay you a fixed amount every month for the rest of your life—guaranteed. No matter how long you live, no matter what the stock market does, you get the same reliable check. It is the ultimate "set it and forget it" approach. You eliminate all investment risk, all market stress, all portfolio management. Maximum simplicity, maximum security.',
      howItWorks: {
        title: 'How Full Annuitization Works',
        steps: [
          'Calculate your desired annual retirement income.',
          'Shop for immediate lifetime annuity quotes from multiple insurance companies.',
          'Choose the best rate: convert your entire portfolio into a guaranteed income stream.',
          'The insurance company takes your lump sum and guarantees you monthly payments for life.',
          'Receive automatic monthly payments forever—no decisions, no management, no stress.',
          'Optional: Add COLA (cost-of-living adjustment) to protect against inflation, or add a survivor benefit for your spouse.'
        ]
      },
      vsTraditional: {
        title: 'Full Annuity vs. Portfolio Management',
        sbloc: [
          'Guaranteed income for life—no possibility of running out',
          'Zero market risk or volatility',
          'No investment decisions or portfolio management',
          'Automatic inflation protection available (with COLA annuity)',
          'Perfect for those who prioritize certainty over upside'
        ],
        traditional: [
          'Income depends on market performance',
          'Risk of depleting assets with bad sequence of returns',
          'Requires ongoing management and decision-making',
          'Market stress and volatility',
          'Potential for higher total returns but with uncertainty'
        ],
        conclusion: 'Full annuitization is the safest possible retirement income strategy. You trade potential market upside and liquidity for guaranteed lifetime income and complete peace of mind. If security matters more than growth, this is the gold standard.'
      },
      benefits: [
        'Guaranteed income for life—impossible to outlive',
        'Complete elimination of market risk',
        'No investment decisions or stress',
        'Simple and automatic—perfect for aging concerns',
        'Protection against cognitive decline',
        'Inflation protection available with COLA riders',
        'Survivor benefits can protect spouse',
        'No sequence of returns risk'
      ],
      considerations: [
        'Irreversible decision—cannot access lump sum later',
        'Zero liquidity for emergencies',
        'No inheritance for heirs (unless you buy survivor benefit)',
        'Miss out on potential market gains',
        'Inflation erodes purchasing power (unless you buy COLA)',
        'Dependent on insurance company solvency',
        'Lower payout if you die early',
        'Fees and costs embedded in payout rate'
      ],
      exampleScenario: {
        title: 'Real Example: $1M Portfolio',
        description: 'See how Full Annuitization provides ultimate security',
        details: [
          '<strong>Portfolio</strong>: $1,000,000 at age 65',
          '<strong>Annuity Quote</strong>: 6% payout rate = $60,000/year for life',
          '<strong>With COLA</strong>: 4.5% payout rate = $45,000/year growing 2% annually',
          '<strong>Year 1</strong>: Receive $60,000 (or $45,000 with COLA)',
          '<strong>Year 20 (no COLA)</strong>: Still receiving $60,000 (inflation reduced real value)',
          '<strong>Year 20 (with COLA)</strong>: Receiving $66,900 (kept pace with 2% inflation)',
          '<strong>Age 95 Result</strong>: Received $1.8M total payments over 30 years. Portfolio-only approach might have run out.',
          '<strong>Key Benefit</strong>: If you live to 100, you will have received $2.1M from a $1M investment—impossible to replicate with a portfolio-only strategy.'
        ]
      },
      bestFor: 'This strategy is ideal for maximum safety-seekers who want zero market risk and guaranteed income for life. Perfect for those without heirs, those with longevity in their family, or anyone who values certainty and simplicity over growth and liquidity.',
      gettingStarted: [
        'Determine your annual income needs',
        'Get quotes from at least 5 highly rated insurance companies (A+ rating or better)',
        'Compare payout rates for single life vs. joint life (with spouse)',
        'Decide if you want COLA (inflation protection) or fixed payments',
        'Verify insurance company financial strength (check AM Best, Moody\'s ratings)',
        'Consider only annuitizing a portion first to test the waters',
        'Set aside 6-12 months of cash BEFORE annuitizing for emergencies',
        'Read all contract terms carefully—this decision is irreversible'
      ]
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    register();
  }

  ngOnInit() {
    this.strategyId = this.route.snapshot.paramMap.get('id') || '';
    this.strategy = this.strategies[this.strategyId] || null;

    if (!this.strategy) {
      console.error('Strategy not found:', this.strategyId);
      // Navigate back to tab2 if strategy not found
      this.router.navigate(['/tabs/tab2']);
    }
  }

  onSlideChange(event: any) {
    const swiper = event.target.swiper;
    this.currentSlide = swiper.activeIndex;
  }

  goBack() {
    this.router.navigate(['/tabs/tab2']);
  }
}
