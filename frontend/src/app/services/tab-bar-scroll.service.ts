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
  private accum = 0;                    // travel accumulated in the current direction
  private readonly TOP_ZONE = 16;      // always full-size within this many px of the top
  private readonly FLIP_THRESHOLD = 28; // deliberate travel (px) needed to flip state

  /**
   * Report the current scroll position of the active scroll container.
   *
   * The state is sticky: once shrunk it stays shrunk until the user makes a
   * deliberate upward scroll (and vice-versa). Accumulating travel and resetting
   * on direction change makes it immune to momentum/bounce after a finger-lift —
   * a small settle never flips the bar back.
   */
  report(scrollTop: number): void {
    const y = Math.max(0, scrollTop);

    // Near the top: always full size.
    if (y <= this.TOP_ZONE) {
      this.accum = 0;
      this.lastY = y;
      if (this.compact()) {
        this.compact.set(false);
      }
      return;
    }

    const dy = y - this.lastY;
    this.lastY = y;
    if (dy === 0) {
      return;
    }

    // Direction reversed -> start accumulating fresh in the new direction.
    if ((dy > 0) !== (this.accum > 0)) {
      this.accum = 0;
    }
    this.accum += dy;

    if (this.accum >= this.FLIP_THRESHOLD && !this.compact()) {
      this.compact.set(true); // deliberate scroll down -> shrink
      this.accum = 0;
    } else if (this.accum <= -this.FLIP_THRESHOLD && this.compact()) {
      this.compact.set(false); // deliberate scroll up -> grow
      this.accum = 0;
    }
  }

  /**
   * Chat-style scroller: never shrink the bar (downward scroll / auto-scroll to
   * the newest message must not shrink it); restore full size once the user
   * reaches the bottom of the scroll area.
   */
  reportNoShrink(scrollTop: number, atBottom: boolean): void {
    this.lastY = Math.max(0, scrollTop);
    this.accum = 0;
    if (atBottom && this.compact()) {
      this.compact.set(false);
    }
  }

  /** Reset to full size (e.g. on tab change). */
  reset(): void {
    this.lastY = 0;
    this.accum = 0;
    if (this.compact()) {
      this.compact.set(false);
    }
  }
}
