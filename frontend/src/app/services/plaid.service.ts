import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface BankAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit';
  mask: string; // Last 4 digits
  institutionName: string;
  isLinked: boolean;
  linkDate: Date;
  status: 'active' | 'inactive' | 'error';
}

export interface PlaidLinkResult {
  success: boolean;
  publicToken?: string;
  metadata?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlaidService {
  private bankAccountsSubject = new BehaviorSubject<BankAccount[]>([]);
  private currentAccountSubject = new BehaviorSubject<BankAccount | null>(null);

  constructor() {
    this.loadBankAccounts();
  }

  // Observable for bank accounts
  getBankAccounts(): Observable<BankAccount[]> {
    return this.bankAccountsSubject.asObservable();
  }

  // Observable for current active account
  getCurrentAccount(): Observable<BankAccount | null> {
    return this.currentAccountSubject.asObservable();
  }

  // Simulate loading bank accounts (in real app, this would call backend)
  private loadBankAccounts(): void {
    try {
      const stored = localStorage.getItem('plaidBankAccounts');
      if (stored) {
        const accounts = JSON.parse(stored).map((acc: any) => ({
          ...acc,
          linkDate: new Date(acc.linkDate)
        }));
        this.bankAccountsSubject.next(accounts);
        
        // Set the first active account as current
        const currentAccount = accounts.find((acc: BankAccount) => acc.status === 'active');
        if (currentAccount) {
          this.currentAccountSubject.next(currentAccount);
        }
      } else {
        // Create demo account if none exists
        this.createDemoAccount();
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      this.createDemoAccount();
    }
  }

  // Create a demo bank account for testing
  private createDemoAccount(): void {
    const demoAccount: BankAccount = {
      id: 'demo-account-1',
      name: 'Main Checking',
      type: 'checking',
      mask: '1234',
      institutionName: 'Chase Bank',
      isLinked: true,
      linkDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      status: 'active'
    };

    this.addBankAccount(demoAccount);
  }

  // Add a new bank account
  addBankAccount(account: BankAccount): void {
    const currentAccounts = this.bankAccountsSubject.value;
    const updatedAccounts = [...currentAccounts, account];
    this.bankAccountsSubject.next(updatedAccounts);
    this.saveBankAccounts(updatedAccounts);

    // Set as current account if it's the first active one
    if (account.status === 'active' && !this.currentAccountSubject.value) {
      this.currentAccountSubject.next(account);
    }
  }

  // Update bank account status
  updateAccountStatus(accountId: string, status: BankAccount['status']): void {
    const accounts = this.bankAccountsSubject.value.map(acc => 
      acc.id === accountId ? { ...acc, status } : acc
    );
    this.bankAccountsSubject.next(accounts);
    this.saveBankAccounts(accounts);

    // Update current account if needed
    const currentAccount = this.currentAccountSubject.value;
    if (currentAccount && currentAccount.id === accountId) {
      this.currentAccountSubject.next({ ...currentAccount, status });
    }
  }

  // Set the active bank account
  setCurrentAccount(accountId: string): void {
    const account = this.bankAccountsSubject.value.find(acc => acc.id === accountId);
    if (account) {
      this.currentAccountSubject.next(account);
      localStorage.setItem('currentPlaidAccount', JSON.stringify(account));
    }
  }

  // Remove a bank account
  removeBankAccount(accountId: string): void {
    const accounts = this.bankAccountsSubject.value.filter(acc => acc.id !== accountId);
    this.bankAccountsSubject.next(accounts);
    this.saveBankAccounts(accounts);

    // Clear current account if it was removed
    const currentAccount = this.currentAccountSubject.value;
    if (currentAccount && currentAccount.id === accountId) {
      const newCurrentAccount = accounts.find(acc => acc.status === 'active') || null;
      this.currentAccountSubject.next(newCurrentAccount);
    }
  }

  // Simulate Plaid Link process
  async initiatePlaidLink(): Promise<PlaidLinkResult> {
    // In a real app, this would:
    // 1. Create Plaid Link token from backend
    // 2. Open Plaid Link modal
    // 3. Handle the result
    // 4. Exchange public token for access token on backend
    
    return new Promise((resolve) => {
      // Simulate async Plaid Link process
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate for demo
        
        if (success) {
          const newAccount: BankAccount = {
            id: `account-${Date.now()}`,
            name: 'New Checking Account',
            type: 'checking',
            mask: Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
            institutionName: this.getRandomBank(),
            isLinked: true,
            linkDate: new Date(),
            status: 'active'
          };
          
          this.addBankAccount(newAccount);
          
          resolve({
            success: true,
            publicToken: 'public-token-' + Date.now(),
            metadata: {
              institution: newAccount.institutionName,
              account: newAccount
            }
          });
        } else {
          resolve({
            success: false,
            error: 'Failed to link bank account. Please try again.'
          });
        }
      }, 2000); // Simulate 2 second process
    });
  }

  // Get account summary for display
  getAccountSummary(): string {
    const currentAccount = this.currentAccountSubject.value;
    if (!currentAccount) {
      return 'No bank account linked';
    }
    
    return `${currentAccount.institutionName} •••• ${currentAccount.mask}`;
  }

  // Check if user has any linked accounts
  hasLinkedAccounts(): boolean {
    return this.bankAccountsSubject.value.some(acc => acc.status === 'active');
  }

  // Private helper methods
  private saveBankAccounts(accounts: BankAccount[]): void {
    try {
      localStorage.setItem('plaidBankAccounts', JSON.stringify(accounts));
    } catch (error) {
      console.error('Error saving bank accounts:', error);
    }
  }

  private getRandomBank(): string {
    const banks = [
      'Chase Bank',
      'Bank of America',
      'Wells Fargo',
      'Citibank',
      'Capital One',
      'TD Bank',
      'PNC Bank',
      'US Bank'
    ];
    return banks[Math.floor(Math.random() * banks.length)];
  }

  // Format date for display
  formatLinkDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  // Get status display text
  getStatusText(status: BankAccount['status']): string {
    switch (status) {
      case 'active':
        return 'Connected';
      case 'inactive':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  }

  // Get status color for UI
  getStatusColor(status: BankAccount['status']): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'medium';
      case 'error':
        return 'danger';
      default:
        return 'medium';
    }
  }
}
