import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonList, IonItem, IonFooter, 
  IonLabel, IonButton, IonSpinner, IonChip, IonIcon, IonButtons, NavController // Added NavController for back
} from '@ionic/angular/standalone';
// import { AlpacaService } from '../../services/alpaca.service'; // Your service

export interface StockAsset { // Keep this export if other parts of app might use it
  symbol: string;
  name: string;
}

@Component({
  selector: 'app-stockselection', // This selector is used if you ever embed it, but not primary for a routed page
  templateUrl: './stockselection.component.html',
  styleUrls: ['./stockselection.component.scss'],
  standalone: true, // CRUCIAL for routing with loadComponent
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, 
    IonSearchbar, IonList, IonItem, IonLabel, IonButton, IonSpinner, IonChip, IonIcon, IonButtons
  ]
})
export class StockSelectionComponent implements OnInit {
  searchTerm: string = '';
  searchResults: StockAsset[] = [];
  selectedStocks: StockAsset[] = [];
  isSearching: boolean = false;
  isProcessing: boolean = false;

  constructor(
    private router: Router,
    private navCtrl: NavController, // For back navigation
    // private alpacaService: AlpacaService
  ) {}

  ngOnInit() {
    console.log('StockSelectionComponent (acting as page) loaded');
  }

  async searchStocks(event: any) {
    const query = event.target.value.toLowerCase();
    if (query && query.length > 1) {
      this.isSearching = true;
      this.searchResults = [];
      console.log('Searching for stocks with query:', query);
      // ---- SIMULATED SEARCH ----
      setTimeout(() => {
        this.searchResults = [
          { symbol: 'AAPL', name: 'Apple Inc.' }, { symbol: 'MSFT', name: 'Microsoft Corp.' },
          { symbol: 'TSLA', name: 'Tesla Inc.' }, { symbol: 'AMZN', name: 'Amazon.com Inc.' },
          { symbol: 'GOOGL', name: 'Alphabet Inc. Class A' }
        ].filter(s => s.symbol.toLowerCase().includes(query) || s.name.toLowerCase().includes(query));
        this.isSearching = false;
      }, 500);
      // ---- END SIMULATED SEARCH ----
    } else {
      this.searchResults = [];
      this.isSearching = false;
    }
  }

  selectStock(stock: StockAsset) {
    if (!this.selectedStocks.find(s => s.symbol === stock.symbol)) {
      this.selectedStocks.push(stock);
    }
    this.searchTerm = '';
    this.searchResults = [];
  }

  removeStock(stockToRemove: StockAsset) {
    this.selectedStocks = this.selectedStocks.filter(stock => stock.symbol !== stockToRemove.symbol);
  }

  async confirmSelections() {
    if (this.selectedStocks.length === 0 && !confirm("You haven't selected any stocks. Do you want to proceed with an automated portfolio?")) {
         // If user presses "Cancel" on the confirm dialog when no stocks are selected
         return;
    }

    this.isProcessing = true;
    console.log('Confirming stock selections:', this.selectedStocks);
    // TODO: Call AlpacaService
    // ---- SIMULATED ALPACA PROCESSING ----
    setTimeout(() => {
      console.log('Stock selections processed with Alpaca (simulated).');
      localStorage.setItem('stockSelectionCompleted', 'true'); // Optional flag
      this.isProcessing = false;
      this.router.navigate(['/confirm-investment'], { replaceUrl: true });
    }, 1500);
    // ---- END SIMULATED ALPACA PROCESSING ----
  }

  skipStockSelection() {
    console.log('User skipped stock selection.');
    // TODO: Potentially set up a default portfolio via AlpacaService if skipped
    localStorage.setItem('choseToPickStocks', 'false');
    localStorage.setItem('stockSelectionSkipped', 'true'); // Optional flag
    this.router.navigate(['/confirm-investment'], { replaceUrl: true });
  }

  goBack() {
    // This will navigate back in the browser history or Ionic stack.
    // Consider where this should lead (e.g., back to the survey page that led here).
    this.navCtrl.back();
  }
}