import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';
import { Subject, takeUntil } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonInput,
  IonToast,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonList,
  IonItem,
  IonSpinner,
  IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { InvestmentService } from '../services/investment.service';
import { PortfolioService, AccountSummary } from '../services/portfolio.service';

interface AlpacaAsset {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
}

@Component({
  selector: 'app-lump-sum-investment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonInput,
    IonToast,
    IonButtons,
    IonBackButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    IonList,
    IonItem,
    IonSpinner,
    IonNote
  ],
  templateUrl: './lump-sum-investment.page.html',
  styleUrls: ['./lump-sum-investment.page.scss']
})
export class LumpSumInvestmentPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Investment data
  investmentAmount: number = 0;
  investmentType: 'portfolio' | 'stock' = 'portfolio';
  fundingSource: 'bank' | 'buying_power' = 'bank';
  buyingPower: number = 0;
  selectedStock: string = '';
  selectedStockInfo: AlpacaAsset | null = null;
  isLoading: boolean = false;
  
  // Stock search
  searchTerm: string = '';
  searchResults: AlpacaAsset[] = [];
  isSearching: boolean = false;
  showSearch: boolean = false;
  
  // Toast messages
  showSuccessToast: boolean = false;
  showErrorToast: boolean = false;
  toastMessage: string = '';

  constructor(
    private router: Router,
    private investmentService: InvestmentService,
    private portfolioService: PortfolioService,
    private http: HttpClient
  ) {
    addIcons({
      cashOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      informationCircleOutline
    });
  }

  ngOnInit() {
    this.loadPortfolioData();
  }

  loadPortfolioData() {
    this.portfolioService.getPortfolioDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data && data.summary) {
            this.buyingPower = data.summary.buyingPower;
          }
        },
        error: (err) => {
          console.error('Failed to load portfolio data', err);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    this.router.navigate(['/tabs/tab3']);
  }

  onAmountChange() {
    // Validate amount
    if (this.investmentAmount < 0) {
      this.investmentAmount = 0;
    }
  }

  onInvestmentTypeChange() {
    // Reset stock selection when switching to portfolio
    if (this.investmentType === 'portfolio') {
      this.selectedStock = '';
      this.selectedStockInfo = null;
      this.showSearch = false;
    } else {
      this.showSearch = true;
    }
  }

  // Search stocks using Alpaca API (same as portfolio-customize)
  async searchStocks(searchTerm?: string): Promise<void> {
    const term = searchTerm || this.searchTerm;
    if (!term || term.length < 2) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    try {
      // Search for US equity stocks
      const stocksResponse = await this.http.get<AlpacaAsset[]>(
        `${environment.backendApiUrl}/alpaca/assets`,
        { 
          headers: this.getAuthHeaders(),
          params: { 
            search: term,
            asset_class: 'us_equity',
            status: 'active'
          }
        }
      ).toPromise();

      // Search for ETFs
      const etfsResponse = await this.http.get<AlpacaAsset[]>(
        `${environment.backendApiUrl}/alpaca/assets`,
        { 
          headers: this.getAuthHeaders(),
          params: { 
            search: term,
            asset_class: 'etf',
            status: 'active'
          }
        }
      ).toPromise();
      
      // Combine results
      let allResults: AlpacaAsset[] = [];
      if (stocksResponse) {
        allResults = allResults.concat(stocksResponse);
      }
      if (etfsResponse) {
        allResults = allResults.concat(etfsResponse);
      }
      
      if (allResults.length > 0) {
        // Filter for tradable assets only and strict string matching
        const termUpper = term.toUpperCase();
        let filteredResults = allResults.filter(asset => 
          asset.tradable && 
          asset.status === 'active' &&
          (asset.symbol.toUpperCase().includes(termUpper) || 
           asset.name.toUpperCase().includes(termUpper))
        );

        // Sort results: exact symbol matches first, then partial matches, then name matches
        filteredResults.sort((a, b) => {
          const aSymbolExact = a.symbol.toUpperCase() === termUpper ? 1 : 0;
          const bSymbolExact = b.symbol.toUpperCase() === termUpper ? 1 : 0;
          
          if (aSymbolExact !== bSymbolExact) return bSymbolExact - aSymbolExact;
          
          const aSymbolPartial = a.symbol.toUpperCase().includes(termUpper) ? 1 : 0;
          const bSymbolPartial = b.symbol.toUpperCase().includes(termUpper) ? 1 : 0;
          
          if (aSymbolPartial !== bSymbolPartial) return bSymbolPartial - aSymbolPartial;
          
          return a.symbol.localeCompare(b.symbol);
        });

        this.searchResults = filteredResults.slice(0, 50); // Limit to 50 results
      } else {
        this.searchResults = [];
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }

  selectStock(asset: AlpacaAsset) {
    this.selectedStock = asset.symbol;
    this.selectedStockInfo = asset;
    this.searchTerm = '';
    this.searchResults = [];
  }

  private getAuthHeaders(): HttpHeaders {
    const token = JwtTokenUtils.getValidJwtToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  makeInvestment() {
    if (!this.validateInvestment()) {
      return;
    }

    this.isLoading = true;

    // Prepare request payload
    const requestData: any = {
      amount: this.investmentAmount,
      type: this.investmentType,
      fundingSource: this.fundingSource
    };

    // Add specific stock symbol if investing in individual stock
    if (this.investmentType === 'stock' && this.selectedStock) {
      requestData.symbol = this.selectedStock;
    }

    // Make actual API call to backend
    this.http.post(`${environment.backendApiUrl}/investments/execute`, requestData, {
      headers: this.getAuthHeaders()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        if (response.success) {
          const investmentTarget = this.investmentType === 'portfolio' 
            ? 'your portfolio' 
            : `${this.getSelectedStockInfo()?.name} (${this.selectedStock})`;
          
          this.showToast(
            `Lump sum investment of ${this.formatCurrency(this.investmentAmount)} into ${investmentTarget} has been initiated successfully! You will receive updates as it processes.`, 
            'success'
          );
          
          // Reset form after successful investment
          setTimeout(() => {
            this.investmentAmount = 0;
            this.selectedStock = '';
            this.selectedStockInfo = null;
            this.investmentType = 'portfolio';
          }, 2000);
        } else {
          this.showToast(response.message || 'Failed to process investment', 'error');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Investment error:', error);
        
        let errorMessage = 'Failed to process investment. Please try again.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.showToast(errorMessage, 'error');
      }
    });
  }

  private validateInvestment(): boolean {
    if (!this.investmentAmount || this.investmentAmount <= 0) {
      this.showToast('Please enter a valid investment amount', 'error');
      return false;
    }

    if (this.investmentAmount < 1) {
      this.showToast('Minimum investment amount is $1', 'error');
      return false;
    }

    if (this.investmentAmount > 1000000) {
      this.showToast('Maximum investment amount is $1,000,000', 'error');
      return false;
    }

    if (this.fundingSource === 'buying_power' && this.investmentAmount > this.buyingPower) {
      this.showToast(`Insufficient buying power. You only have ${this.formatCurrency(this.buyingPower)} available.`, 'error');
      return false;
    }

    if (this.investmentType === 'stock' && !this.selectedStock) {
      this.showToast('Please select a stock to invest in', 'error');
      return false;
    }

    return true;
  }

  getSelectedStockInfo() {
    return this.selectedStockInfo;
  }

  getInvestmentTarget(): string {
    if (this.investmentType === 'portfolio') {
      return 'your portfolio';
    } else if (this.selectedStockInfo) {
      return `${this.selectedStockInfo.name} (${this.selectedStockInfo.symbol})`;
    }
    return 'selected investment';
  }

  getSharesCount(): number {
    // For real stock pricing, you'd need to make another API call to get current price
    // For now, we'll show that it would be calculated
    return 0; // This would be calculated with real-time price data
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    if (type === 'success') {
      this.showSuccessToast = true;
    } else {
      this.showErrorToast = true;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  getProjectedGrowth(): number {
    // Simple 7% annual growth calculation for display
    const annualRate = 0.07;
    return this.investmentAmount * (1 + annualRate);
  }
}
