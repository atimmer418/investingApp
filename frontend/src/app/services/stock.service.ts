import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private apiUrl = '/api/stocks/search'; // Placeholder

  constructor(private http: HttpClient) { }

  searchStocks(symbol: string): Observable<any[]> {
    // In a real application, you would handle errors and map the response
    return this.http.get<any[]>(`${this.apiUrl}?symbol=${symbol}`);
  }
}
