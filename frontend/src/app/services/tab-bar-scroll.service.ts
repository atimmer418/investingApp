import { Injectable, signal } from '@angular/core';

/**
 * Drives the floating tab bar's shrink-on-scroll behavior.
 * Pages feed scrollTop via the appTabBarScroll directive; the bar reads `compact`.
 */
@Injectable({ providedIn: 'root' })
export class TabBarScrollService {
  /** true => the tab bar should render compact (shrunk). */
  readonly compact = signal(false);

  private lastY = 0;
  private readonly DELTA = 8;     // ignore scroll jitter smaller than this
  private readonly TOP_ZONE = 16; // always full-size within this many px of the top

  /** Report the current scroll position of the active scroll container. */
  report(scrollTop: number): void {
    const y = Math.max(0, scrollTop);

    // Near the top: always full size.
    if (y <= this.TOP_ZONE) {
      if (this.compact()) {
        this.compact.set(false);
      }
      this.lastY = y;
      return;
    }

    const dy = y - this.lastY;
    if (Math.abs(dy) < this.DELTA) {
      return; // not enough movement to react
    }

    if (dy > 0 && !this.compact()) {
      this.compact.set(true); // scrolling down -> shrink
    } else if (dy < 0 && this.compact()) {
      this.compact.set(false); // scrolling up -> grow
    }
    this.lastY = y;
  }

  /** Reset to full size (e.g. on tab change). */
  reset(): void {
    this.lastY = 0;
    if (this.compact()) {
      this.compact.set(false);
    }
  }
}
