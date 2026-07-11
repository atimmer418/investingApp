import { Injectable, signal } from '@angular/core';

/**
 * Tells each top-level tab when it becomes the active slide in the swipeable
 * pager. Replaces the Ionic per-tab lifecycle hooks (ionViewWillEnter etc.),
 * which no longer fire once all four tabs are mounted together in the pager.
 */
@Injectable({ providedIn: 'root' })
export class TabActivationService {
  // equal: () => false makes every setActive() re-notify effects even when the
  // tab is unchanged, so a re-pulse (returning to a cached tab from a pushed
  // sub-page) re-runs that tab's on-enter work despite Angular signal dedup.
  private readonly _activeTab = signal<string>('tab1', { equal: () => false });
  readonly activeTab = this._activeTab.asReadonly();

  setActive(tab: string): void {
    this._activeTab.set(tab);
  }
}
