import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonLabel, IonTitle, IonContent, IonSearchbar, IonList, IonItem } from '@ionic/angular/standalone';
import { StockService } from '../services/stock.service'; // Import StockService
import { Subscription } from 'rxjs';

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
    IonLabel,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem
  ]
})
export class Tab2Page {
  searchResults: any[] = [];
  private searchSubscription: Subscription | undefined;
  lastSearchQuery: string = ''; // Added

  constructor(private stockService: StockService) {} // Inject StockService

  handleSearchInput(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.lastSearchQuery = query; // Added

    // Unsubscribe from previous search if any
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    if (query && query !== '') {
      this.searchSubscription = this.stockService.searchStocks(query).subscribe({
        next: (data) => {
          this.searchResults = data;
          console.log('Stock data received:', data);
        },
        error: (err) => {
          console.error('Error fetching stock data:', err);
          this.searchResults = []; // Clear results on error
        }
      });
    } else {
      this.searchResults = []; // Clear results if query is empty
    }
  }

  // Optional: Unsubscribe on component destruction to prevent memory leaks
  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}
