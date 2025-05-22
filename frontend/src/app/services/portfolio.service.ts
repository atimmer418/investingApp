
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  constructor() {}

  getPortfolio() {
    return [{ name: 'AAPL', shares: 10 }, { name: 'TSLA', shares: 5 }];
  }
}
