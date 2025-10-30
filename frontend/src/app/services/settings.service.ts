import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    push: boolean;
    email: boolean;
    marketUpdates: boolean;
    portfolioAlerts: boolean;
    investmentReminders: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    marketingEmails: boolean;
  };
  investment: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    autoRebalance: boolean;
    dividendReinvestment: boolean;
  };
}

export interface RecurringInvestment {
  id: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  nextDate: Date;
  isActive: boolean;
  portfolioAllocation?: {
    [symbol: string]: number; // percentage
  };
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private preferencesSubject = new BehaviorSubject<UserPreferences>({
    theme: 'auto',
    language: 'en',
    notifications: {
      push: true,
      email: true,
      marketUpdates: true,
      portfolioAlerts: true,
      investmentReminders: true
    },
    privacy: {
      shareAnalytics: false,
      marketingEmails: false
    },
    investment: {
      riskTolerance: 'moderate',
      autoRebalance: true,
      dividendReinvestment: true
    }
  });

  private recurringInvestmentSubject = new BehaviorSubject<RecurringInvestment | null>(null);

  constructor() {
    this.loadPreferences();
    this.loadRecurringInvestment();
  }

  // User Preferences
  getPreferences(): Observable<UserPreferences> {
    return this.preferencesSubject.asObservable();
  }

  updatePreferences(preferences: Partial<UserPreferences>): void {
    const current = this.preferencesSubject.value;
    const updated = { ...current, ...preferences };
    this.preferencesSubject.next(updated);
    this.savePreferences(updated);
  }

  // Recurring Investment
  getRecurringInvestment(): Observable<RecurringInvestment | null> {
    return this.recurringInvestmentSubject.asObservable();
  }

  updateRecurringInvestment(investment: RecurringInvestment): void {
    this.recurringInvestmentSubject.next(investment);
    this.saveRecurringInvestment(investment);
  }

  pauseRecurringInvestment(): void {
    const current = this.recurringInvestmentSubject.value;
    if (current) {
      const updated = { ...current, isActive: false };
      this.updateRecurringInvestment(updated);
    }
  }

  resumeRecurringInvestment(): void {
    const current = this.recurringInvestmentSubject.value;
    if (current) {
      const updated = { ...current, isActive: true };
      this.updateRecurringInvestment(updated);
    }
  }

  // Theme Management
  applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark', prefersDark);
    } else {
      document.body.classList.toggle('dark', theme === 'dark');
    }
    
    this.updatePreferences({ theme });
  }

  // Private methods for persistence
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('userPreferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.preferencesSubject.next(preferences);
        
        // Apply theme immediately
        this.applyTheme(preferences.theme);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  private savePreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  private loadRecurringInvestment(): void {
    try {
      const stored = localStorage.getItem('recurringInvestment');
      if (stored) {
        const investment = JSON.parse(stored);
        investment.nextDate = new Date(investment.nextDate); // Parse date
        this.recurringInvestmentSubject.next(investment);
      }
    } catch (error) {
      console.error('Error loading recurring investment:', error);
    }
  }

  private saveRecurringInvestment(investment: RecurringInvestment): void {
    try {
      localStorage.setItem('recurringInvestment', JSON.stringify(investment));
    } catch (error) {
      console.error('Error saving recurring investment:', error);
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  getNextInvestmentDate(frequency: string, lastDate: Date = new Date()): Date {
    const next = new Date(lastDate);
    
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }
    
    return next;
  }
}
