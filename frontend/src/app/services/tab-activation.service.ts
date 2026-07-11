import { Injectable, signal } from '@angular/core';

/**
 * Tells each top-level tab when it becomes the active slide in the swipeable
 * pager. Replaces the Ionic per-tab lifecycle hooks (ionViewWillEnter etc.),
 * which no longer fire once all four tabs are mounted together in the pager.
 */
@Injectable({ providedIn: 'root' })
export class TabActivationService {
  private readonly _activeTab = signal<string>('tab1');
  readonly activeTab = this._activeTab.asReadonly();

  setActive(tab: string): void {
    this._activeTab.set(tab);
  }
}
