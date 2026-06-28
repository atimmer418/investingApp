import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonList, IonItem, IonFooter,
  IonLabel, IonButton, IonSpinner, IonChip, IonIcon, IonButtons, NavController
} from '@ionic/angular/standalone';
import { Subject, debounceTime, distinctUntilChanged, switchMap, forkJoin, of, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { JwtTokenUtils } from '../../utils/jwt-token.utils';
import { AlpacaAsset } from '../../services/alpaca.service';
import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';

export interface StockAsset {
  symbol: string;
  name: string;
}

@Component({
  selector: 'app-stockselection',
  templateUrl: './stockselection.component.html',
  styleUrls: ['./stockselection.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonSearchbar, IonList, IonItem, IonLabel, IonButton, IonSpinner, IonChip, IonIcon, IonButtons,
    KeyboardAvoidDirective
  ]
})
export class StockSelectionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  searchInput$ = new Subject<string>();

  searchTerm: string = '';
  searchResults: StockAsset[] = [];
  selectedStocks: StockAsset[] = [];
  isSearching: boolean = false;
  isProcessing: boolean = false;

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private http: HttpClient
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = JwtTokenUtils.getValidJwtToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  ngOnInit() {
    console.log('StockSelectionComponent (acting as page) loaded');

    // Debounced backend search pipe
    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || term.length < 2) {
          this.searchResults = [];
          this.isSearching = false;
          return of(null);
        }
        this.isSearching = true;
        const equity$ = this.http.get<AlpacaAsset[]>(
          `${environment.backendApiUrl}/alpaca/assets`,
          {
            headers: this.getAuthHeaders(),
            params: { search: term, asset_class: 'us_equity', status: 'active' }
          }
        ).pipe(catchError(() => of([] as AlpacaAsset[])));
        const etf$ = this.http.get<AlpacaAsset[]>(
          `${environment.backendApiUrl}/alpaca/assets`,
          {
            headers: this.getAuthHeaders(),
            params: { search: term, asset_class: 'etf', status: 'active' }
          }
        ).pipe(catchError(() => of([] as AlpacaAsset[])));
        return forkJoin([equity$, etf$]).pipe(
          catchError(() => of([[] as AlpacaAsset[], [] as AlpacaAsset[]]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.isSearching = false;
      if (result === null) {
        return;
      }
      const [equityResults, etfResults] = result as [AlpacaAsset[], AlpacaAsset[]];
      const allResults = [...equityResults, ...etfResults];
      this.searchResults = allResults.map(asset => ({
        symbol: asset.symbol,
        name: asset.name
      }));
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: any): void {
    const value: string = event.target?.value ?? '';
    this.searchInput$.next(value);
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
      return;
    }

    this.isProcessing = true;
    console.log('Confirming stock selections:', this.selectedStocks);
    // TODO: Call AlpacaService
    // ---- SIMULATED ALPACA PROCESSING ----
    setTimeout(() => {
      console.log('Stock selections processed with Alpaca (simulated).');
      localStorage.setItem('stockSelectionCompleted', 'true');
      this.isProcessing = false;
      this.router.navigate(['/investment-confirmation'], { replaceUrl: true });
    }, 1500);
    // ---- END SIMULATED ALPACA PROCESSING ----
  }

  skipStockSelection() {
    console.log('User skipped stock selection.');
    localStorage.setItem('choseToPickStocks', 'false');
    localStorage.setItem('stockSelectionSkipped', 'true');
    this.router.navigate(['/investment-confirmation'], { replaceUrl: true });
  }

  goBack() {
    this.navCtrl.back();
  }
}
