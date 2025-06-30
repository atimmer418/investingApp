import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ngrok
const BACKEND_API_URL = environment.backendApiUrl;

@Injectable({
  providedIn: 'root'
})
export class StockService {

  constructor(private http: HttpClient) { }

  searchStocks(symbol: string): Observable<any[]> {
    // In a real application, you would handle errors and map the response
    return this.http.get<any[]>(`${BACKEND_API_URL}/stocks/search?symbol=${symbol}`);
  }
}
