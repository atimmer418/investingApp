import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButtons, IonBackButton, IonNote, IonChip, IonInput, IonRange, IonReorder, IonReorderGroup,
  IonItemSliding, IonItemOptions, IonItemOption
} from '@ionic/angular/standalone';

interface Stock {
  symbol: string;
  name: string;
  allocation: number;
  description: string;
  isDefault?: boolean;
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
    IonButtons, IonBackButton, IonNote, IonChip, IonInput, IonRange, IonReorder, IonReorderGroup,
    IonItemSliding, IonItemOptions, IonItemOption
  ]
})
export class PortfolioCustomizeComponent implements OnInit {
  
  // Current portfolio
  portfolio: Stock[] = [
    {
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      allocation: 40,
      description: 'Tracks the entire U.S. stock market',
      isDefault: true
    },
    {
      symbol: 'VXUS',
      name: 'Vanguard Total International Stock ETF',
      allocation: 30,
      description: 'International diversification outside the U.S.',
      isDefault: true
    },
    {
      symbol: 'BND',
      name: 'Vanguard Total Bond Market ETF',
      allocation: 20,
      description: 'Broad exposure to U.S. investment grade bonds',
      isDefault: true
    },
    {
      symbol: 'VNQ',
      name: 'Vanguard Real Estate ETF',
      allocation: 10,
      description: 'Real estate investment trusts (REITs)',
      isDefault: true
    }
  ];

  // Popular stocks to add
  popularStocks: Stock[] = [
    {
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      allocation: 0,
      description: 'Tracks the S&P 500 index'
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      allocation: 0,
      description: 'Tracks the Nasdaq 100 index'
    },
    {
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market',
      allocation: 0,
      description: 'Total U.S. stock market exposure'
    },
    {
      symbol: 'SCHD',
      name: 'Schwab US Dividend Equity ETF',
      allocation: 0,
      description: 'High dividend yield U.S. stocks'
    }
  ];

  // New stock form
  newStock = {
    symbol: '',
    allocation: 10
  };

  showAddStock = false;

  constructor(private router: Router) {}

  ngOnInit() {
    console.log('[PortfolioCustomizeComponent] Initializing portfolio customization');
  }

  // Pin formatter for ion-range
  pinFormatter = (value: number): string => {
    return `${value}%`;
  };

  // Helper methods for template
  isStockInPortfolio(stock: Stock): boolean {
    return this.portfolio.some(s => s.symbol === stock.symbol);
  }

  getStockIconName(stock: Stock): string {
    return this.isStockInPortfolio(stock) ? 'checkmark-circle' : 'add-circle-outline';
  }

  getStockIconColor(stock: Stock): string {
    return this.isStockInPortfolio(stock) ? 'success' : 'primary';
  }

  toggleAddStock(): void {
    this.showAddStock = !this.showAddStock;
  }

  hideAddStock(): void {
    this.showAddStock = false;
  }

  updateNewStockAllocation(event: any): void {
    this.newStock.allocation = event.detail.value;
  }

  isNewStockValid(): boolean {
    return this.newStock.symbol.trim().length > 0;
  }

  // Get total allocation percentage
  getTotalAllocation(): number {
    return this.portfolio.reduce((total, stock) => total + stock.allocation, 0);
  }

  // Check if allocations are valid
  isValidAllocation(): boolean {
    const total = this.getTotalAllocation();
    return total === 100 && this.portfolio.length > 0;
  }

  // Update stock allocation
  updateAllocation(stock: Stock, event: any) {
    stock.allocation = parseInt(event.detail.value);
    this.normalizeAllocations();
  }

  // Normalize allocations to ensure they add up to 100%
  normalizeAllocations() {
    const total = this.getTotalAllocation();
    if (total !== 100 && total > 0) {
      // Proportionally adjust allocations
      this.portfolio.forEach(stock => {
        stock.allocation = Math.round((stock.allocation / total) * 100);
      });
      
      // Handle rounding errors
      const newTotal = this.getTotalAllocation();
      if (newTotal !== 100) {
        const diff = 100 - newTotal;
        this.portfolio[0].allocation += diff;
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

  // Add popular stock to portfolio
  addPopularStock(stock: Stock) {
    // Check if already in portfolio
    const exists = this.portfolio.find(s => s.symbol === stock.symbol);
    if (exists) return;

    // Add with 10% allocation
    const newStock: Stock = {
      ...stock,
      allocation: 10
    };
    
    this.portfolio.push(newStock);
    this.normalizeAllocations();
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

    // Retrieve stock names from API
    const stock: Stock = {
      symbol: this.newStock.symbol.toUpperCase(),
      name: this.newStock.symbol.toUpperCase(), // Would normally fetch from API
      allocation: this.newStock.allocation,
      description: 'Custom stock selection'
    };

    this.portfolio.push(stock);
    this.normalizeAllocations();
    
    // Reset form
    this.newStock = { symbol: '', allocation: 10 };
    this.showAddStock = false;
  }

  // Reorder stocks
  reorderStocks(event: any) {
    const itemMove = this.portfolio.splice(event.detail.from, 1)[0];
    this.portfolio.splice(event.detail.to, 0, itemMove);
    event.detail.complete();
  }

  // Reset to default portfolio
  resetToDefault() {
    this.portfolio = [
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        allocation: 40,
        description: 'Tracks the entire U.S. stock market',
        isDefault: true
      },
      {
        symbol: 'VXUS',
        name: 'Vanguard Total International Stock ETF',
        allocation: 30,
        description: 'International diversification outside the U.S.',
        isDefault: true
      },
      {
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        allocation: 20,
        description: 'Broad exposure to U.S. investment grade bonds',
        isDefault: true
      },
      {
        symbol: 'VNQ',
        name: 'Vanguard Real Estate ETF',
        allocation: 10,
        description: 'Real estate investment trusts (REITs)',
        isDefault: true
      }
    ];
  }

  // Save portfolio and return to confirmation
  savePortfolio() {
    if (!this.isValidAllocation()) {
      alert('Portfolio allocations must add up to 100%');
      return;
    }

    console.log('[PortfolioCustomizeComponent] Saving portfolio:', this.portfolio);
    
    // In a real app, save to backend/local storage
    localStorage.setItem('customPortfolio', JSON.stringify(this.portfolio));
    
    // Navigate back to confirmation
    this.router.navigate(['/confirm-investment']);
  }

  // Cancel and return to confirmation
  cancel() {
    this.router.navigate(['/confirm-investment']);
  }
}