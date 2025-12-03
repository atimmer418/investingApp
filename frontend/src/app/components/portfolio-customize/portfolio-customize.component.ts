import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButtons, IonBackButton, IonNote, IonChip, IonRange, IonReorder, IonReorderGroup,
  IonItemSliding, IonItemOptions, IonItemOption, IonSpinner, IonSearchbar, IonInput, IonBadge
} from '@ionic/angular/standalone';

interface PortfolioItem {
  symbol: string;
  name: string;
  percentage: number;
  assetType?: string;
}

interface PortfolioResponse {
  id: number;
  name: string;
  totalPercentage: number;
  isDefault: boolean;
  portfolioItems: PortfolioItemResponse[];
  createdAt: string;
  updatedAt: string;
}

interface PortfolioItemResponse {
  id: number;
  symbol: string;
  name: string;
  percentage: number;
  assetType: string;
}

interface UpdatePortfolioRequest {
  portfolioItems: PortfolioItem[];
}

interface AlpacaAsset {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
}

interface Stock {
  symbol: string;
  name: string;
  percentage: number;
  description?: string;
  isDefault?: boolean;
  tradable?: boolean;
  assetType?: string;
}

@Component({
  selector: 'app-portfolio-customize',
  templateUrl: './portfolio-customize.component.html',
  styleUrls: ['./portfolio-customize.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButtons, IonBackButton, IonNote, IonChip, IonRange, IonReorder, IonReorderGroup,
    IonItemSliding, IonItemOptions, IonItemOption, IonSpinner, IonSearchbar, IonInput, IonBadge
  ]
})
export class PortfolioCustomizeComponent implements OnInit {
  
  // Current portfolio
  portfolio: Stock[] = [];
  
  // Track original portfolio for change detection
  originalPortfolio: Stock[] = [];
  
  // Loading states
  isLoading = false;
  isSaving = false;
  isSearching = false;
  
  // Stock search
  searchTerm = '';
  searchResults: AlpacaAsset[] = [];
  
  // New stock form
  newStock = {
    symbol: '',
    percentage: 10
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    console.log('[PortfolioCustomizeComponent] Initializing portfolio customization');
    this.loadCurrentPortfolio();
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const token = JwtTokenUtils.getValidJwtToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    headers = headers.set('Content-Type', 'application/json');
    return headers;
  }

  // Load current portfolio from backend
  async loadCurrentPortfolio(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.http.get<PortfolioResponse>(
        `${environment.backendApiUrl}/portfolio/current`, 
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      if (response) {
        this.portfolio = response.portfolioItems.map(item => ({
          symbol: item.symbol,
          name: item.name,
          percentage: item.percentage,
          assetType: item.assetType,
          description: `${item.assetType}: ${item.name}`,
          isDefault: response.isDefault
        }));
        
        // Save original state for change detection
        this.originalPortfolio = JSON.parse(JSON.stringify(this.portfolio));
      }
      
      console.log('[PortfolioCustomizeComponent] Loaded portfolio:', this.portfolio);
    } catch (error) {
      console.error('[PortfolioCustomizeComponent] Error loading portfolio:', error);
      // Fall back to default portfolio
      this.setDefaultPortfolio();
    } finally {
      this.isLoading = false;
    }
  }

  // Set default portfolio
  private setDefaultPortfolio(): void {
    this.portfolio = [
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        percentage: 70,
        assetType: 'ETF',
        description: 'Tracks the entire U.S. stock market',
        isDefault: true
      },
      {
        symbol: 'VXUS',
        name: 'Vanguard Total International Stock ETF',
        percentage: 20,
        assetType: 'ETF',
        description: 'International diversification outside the U.S.',
        isDefault: true
      },
      {
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        percentage: 10,
        assetType: 'ETF',
        description: 'Broad exposure to U.S. investment grade bonds',
        isDefault: true
      }
    ];
    
    // Save original state for change detection
    this.originalPortfolio = JSON.parse(JSON.stringify(this.portfolio));
  }

  // Search stocks using Alpaca API with enhanced search
  async searchStocks(searchTerm?: string): Promise<void> {
    const term = searchTerm || this.searchTerm;
    if (!term || term.length < 2) {
      this.searchResults = [];
      return;
    }

    console.log(`[PortfolioCustomizeComponent] Starting search for: "${term}"`);
    console.log(`[PortfolioCustomizeComponent] Backend URL: ${environment.backendApiUrl}`);
    console.log(`[PortfolioCustomizeComponent] Auth headers:`, this.getAuthHeaders().keys());
    this.isSearching = true;
    try {
      console.log(`[PortfolioCustomizeComponent] Searching stocks with URL: ${environment.backendApiUrl}/alpaca/assets`);
      
      // First search for US equity stocks
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

      console.log(`[PortfolioCustomizeComponent] Stocks response:`, stocksResponse);

      // Then search for ETFs
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

      console.log(`[PortfolioCustomizeComponent] ETFs response:`, etfsResponse);
      
      // Combine results
      let allResults: AlpacaAsset[] = [];
      if (stocksResponse) {
        allResults = allResults.concat(stocksResponse);
      }
      if (etfsResponse) {
        allResults = allResults.concat(etfsResponse);
      }
      
      if (allResults.length > 0) {
        // Filter for tradable assets only
        let filteredResults = allResults.filter(asset => 
          asset.tradable && asset.status === 'active'
        );

        // Enhanced search: prioritize exact symbol matches, then partial symbol matches, then name matches
        const termUpper = term.toUpperCase();
        
        // Sort results by relevance
        filteredResults.sort((a, b) => {
          // Exact symbol match gets highest priority
          const aExactSymbol = a.symbol === termUpper ? 1 : 0;
          const bExactSymbol = b.symbol === termUpper ? 1 : 0;
          if (aExactSymbol !== bExactSymbol) return bExactSymbol - aExactSymbol;
          
          // Symbol starts with search term
          const aSymbolStart = a.symbol.startsWith(termUpper) ? 1 : 0;
          const bSymbolStart = b.symbol.startsWith(termUpper) ? 1 : 0;
          if (aSymbolStart !== bSymbolStart) return bSymbolStart - aSymbolStart;
          
          // Symbol contains search term
          const aSymbolContains = a.symbol.includes(termUpper) ? 1 : 0;
          const bSymbolContains = b.symbol.includes(termUpper) ? 1 : 0;
          if (aSymbolContains !== bSymbolContains) return bSymbolContains - aSymbolContains;
          
          // Name contains search term (case insensitive)
          const aNameContains = a.name.toLowerCase().includes(term.toLowerCase()) ? 1 : 0;
          const bNameContains = b.name.toLowerCase().includes(term.toLowerCase()) ? 1 : 0;
          if (aNameContains !== bNameContains) return bNameContains - aNameContains;
          
          // Alphabetical by symbol as final sort
          return a.symbol.localeCompare(b.symbol);
        });

        this.searchResults = filteredResults.slice(0, 50); // Increased limit for better search results
      }
      
      console.log(`[PortfolioCustomizeComponent] Search for "${term}" returned ${this.searchResults.length} results`);
    } catch (error) {
      console.error('[PortfolioCustomizeComponent] Error searching stocks:', error);
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }

  // Pin formatter for ion-range
  pinFormatter = (value: number): string => {
    return `${value}%`;
  };

  // Helper methods for template
  isStockInPortfolio(asset: AlpacaAsset): boolean {
    return this.portfolio.some(s => s.symbol === asset.symbol);
  }

  getStockIconName(asset: AlpacaAsset): string {
    return this.isStockInPortfolio(asset) ? 'checkmark-circle' : 'add-circle-outline';
  }

  getStockIconColor(asset: AlpacaAsset): string {
    return this.isStockInPortfolio(asset) ? 'success' : 'primary';
  }

  updateNewStockPercentage(event: any): void {
    this.newStock.percentage = event.detail.value;
  }

  isNewStockValid(): boolean {
    return this.newStock.symbol.trim().length > 0;
  }

  // Get total allocation percentage
  getTotalAllocation(): number {
    return this.portfolio.reduce((total, stock) => total + stock.percentage, 0);
  }

  // Check if allocations are valid
  isValidAllocation(): boolean {
    const total = this.getTotalAllocation();
    return total === 100 && this.portfolio.length > 0;
  }

  // Check if portfolio has been modified from original
  hasPortfolioChanged(): boolean {
    if (this.portfolio.length !== this.originalPortfolio.length) {
      return true;
    }
    
    // Check if any stock symbol, percentage, or order has changed
    for (let i = 0; i < this.portfolio.length; i++) {
      const current = this.portfolio[i];
      const original = this.originalPortfolio[i];
      
      if (current.symbol !== original.symbol || 
          current.percentage !== original.percentage) {
        return true;
      }
    }
    
    return false;
  }

  // Check if current portfolio differs from default portfolio
  isPortfolioDifferentFromDefault(): boolean {
    const defaultPortfolio = this.getDefaultPortfolioStructure();
    
    if (this.portfolio.length !== defaultPortfolio.length) {
      return true;
    }
    
    // Check if any stock symbol or percentage differs from default
    for (let i = 0; i < this.portfolio.length; i++) {
      const current = this.portfolio[i];
      const defaultStock = defaultPortfolio.find(stock => stock.symbol === current.symbol);
      
      if (!defaultStock || current.percentage !== defaultStock.percentage) {
        return true;
      }
    }
    
    return false;
  }

  // Get the default portfolio structure for comparison
  private getDefaultPortfolioStructure(): Stock[] {
    return [
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        percentage: 70,
        assetType: 'ETF',
        description: 'Tracks the entire U.S. stock market',
        isDefault: true
      },
      {
        symbol: 'VXUS',
        name: 'Vanguard Total International Stock ETF',
        percentage: 20,
        assetType: 'ETF',
        description: 'International diversification outside the U.S.',
        isDefault: true
      },
      {
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        percentage: 10,
        assetType: 'ETF',
        description: 'Broad exposure to U.S. investment grade bonds',
        isDefault: true
      }
    ];
  }

  // Update stock allocation
  updateAllocation(stock: Stock, event: any) {
    stock.percentage = parseInt(event.detail.value);
    // Removed normalizeAllocations() to allow manual adjustment without side effects
  }

  // Normalize allocations to ensure they add up to 100%
  normalizeAllocations() {
    const total = this.getTotalAllocation();
    if (total !== 100 && total > 0) {
      // Proportionally adjust allocations
      this.portfolio.forEach(stock => {
        stock.percentage = Math.round((stock.percentage / total) * 100);
      });
      
      // Handle rounding errors
      const newTotal = this.getTotalAllocation();
      if (newTotal !== 100) {
        const diff = 100 - newTotal;
        this.portfolio[0].percentage += diff;
      }
    }
  }

  // Remove stock from portfolio
  removeStock(stock: Stock) {
    const index = this.portfolio.findIndex(s => s.symbol === stock.symbol);
    if (index > -1) {
      this.portfolio.splice(index, 1);
      this.normalizeAllocations();
    }
  }

  // Add asset from search results to portfolio
  addAssetToPortfolio(asset: AlpacaAsset) {
    // Check if already in portfolio
    const exists = this.portfolio.find(s => s.symbol === asset.symbol);
    if (exists) return;

    // Add with 10% allocation
    const newStock: Stock = {
      symbol: asset.symbol,
      name: asset.name,
      percentage: 10,
      assetType: asset.class === 'etf' ? 'ETF' : 'STOCK',
      description: `${asset.class.toUpperCase()}: ${asset.name}`,
      tradable: asset.tradable
    };
    
    this.portfolio.push(newStock);
    this.normalizeAllocations();
    
    // Clear search
    this.searchTerm = '';
    this.searchResults = [];
  }

  // Add custom stock
  addCustomStock() {
    if (!this.newStock.symbol.trim()) return;

    // Check if already exists
    const exists = this.portfolio.find(s => s.symbol.toLowerCase() === this.newStock.symbol.toLowerCase());
    if (exists) {
      alert('This stock is already in your portfolio');
      return;
    }

    // Add the stock
    const stock: Stock = {
      symbol: this.newStock.symbol.toUpperCase(),
      name: this.newStock.symbol.toUpperCase(),
      percentage: this.newStock.percentage,
      assetType: 'STOCK',
      description: 'Custom stock selection'
    };

    this.portfolio.push(stock);
    this.normalizeAllocations();
    
    // Reset form
    this.newStock = { symbol: '', percentage: 10 };
  }

  // Reorder stocks
  reorderStocks(event: any) {
    const itemMove = this.portfolio.splice(event.detail.from, 1)[0];
    this.portfolio.splice(event.detail.to, 0, itemMove);
    event.detail.complete();
  }

  // Reset to default portfolio
  async resetToDefault() {
    this.isLoading = true;
    try {
      const response = await this.http.post<PortfolioResponse>(
        `${environment.backendApiUrl}/portfolio/reset-to-default`,
        {},
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      if (response) {
        this.portfolio = response.portfolioItems.map(item => ({
          symbol: item.symbol,
          name: item.name,
          percentage: item.percentage,
          assetType: item.assetType,
          description: `${item.assetType}: ${item.name}`,
          isDefault: true
        }));
      }
      
      console.log('[PortfolioCustomizeComponent] Reset to default portfolio');
    } catch (error) {
      console.error('[PortfolioCustomizeComponent] Error resetting portfolio:', error);
      this.setDefaultPortfolio();
    } finally {
      this.isLoading = false;
    }
  }

  // Save portfolio and return to confirmation
  async savePortfolio() {
    if (!this.isValidAllocation()) {
      alert('Portfolio allocations must add up to 100%');
      return;
    }

    this.isSaving = true;
    console.log('[PortfolioCustomizeComponent] Saving portfolio:', this.portfolio);
    
    try {
      const updateRequest: UpdatePortfolioRequest = {
        portfolioItems: this.portfolio.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          percentage: stock.percentage,
          assetType: stock.assetType || 'STOCK'
        }))
      };

      const response = await this.http.put<PortfolioResponse>(
        `${environment.backendApiUrl}/portfolio/update`,
        updateRequest,
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      if (response) {
        console.log('[PortfolioCustomizeComponent] Portfolio saved successfully');
        // Navigate back to confirmation
        this.router.navigate(['/investment-confirmation']);
      }
    } catch (error) {
      console.error('[PortfolioCustomizeComponent] Error saving portfolio:', error);
      alert('Failed to save portfolio. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  // Cancel and return to confirmation
  cancel() {
    this.router.navigate(['/investment-confirmation']);
  }
}