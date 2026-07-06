import { Directive, ElementRef, HostListener, Input, OnInit, inject } from '@angular/core';
import { TabBarScrollService } from '../services/tab-bar-scroll.service';

/**
 * Attach to a tab's real scroll container so the floating tab bar shrinks on
 * scroll-down and grows on scroll-up. Works on <ion-content> (shadow-DOM scroll,
 * via ionScroll) and on plain overflow-scrolling elements (native scroll).
 *
 * Add the `tabBarNoShrink` attribute (e.g. on the chat page) to make this
 * scroller never shrink the bar; instead the bar restores to full size when the
 * user reaches the bottom of the scroll area.
 */
@Directive({
  selector: '[appTabBarScroll]',
  standalone: true,
})
export class TabBarScrollDirective implements OnInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly scrollSvc = inject(TabBarScrollService);

  /** Present => never shrink from this scroller; reaching the bottom restores full size. */
  @Input() tabBarNoShrink: boolean | '' = false;

  /** Cached ion-content shadow scroll element (for scrollHeight/clientHeight). */
  private ionScrollEl?: HTMLElement;
  private readonly BOTTOM_ZONE = 24; // px from the end counted as "at the bottom"

  ngOnInit(): void {
    const node = this.el.nativeElement;
    if (node.tagName === 'ION-CONTENT') {
      // ion-content scrolls inside its shadow DOM; opt into scroll events.
      (node as unknown as { scrollEvents: boolean }).scrollEvents = true;
      // Cache the scroll element so we can read scrollHeight/clientHeight for bottom detection.
      (node as unknown as { getScrollElement?: () => Promise<HTMLElement> })
        .getScrollElement?.()
        .then((se) => (this.ionScrollEl = se))
        .catch(() => undefined);
    }
  }

  private get noShrink(): boolean {
    return this.tabBarNoShrink === '' || this.tabBarNoShrink === true;
  }

  /** Native scroll (plain elements such as div.content-scroll). */
  @HostListener('scroll', ['$event'])
  onNativeScroll(event: Event): void {
    const t = event.target as HTMLElement | null;
    if (t) {
      this.dispatch(t.scrollTop, t.clientHeight, t.scrollHeight);
    }
  }

  /** Ionic scroll (ion-content). */
  @HostListener('ionScroll', ['$event'])
  onIonScroll(event: CustomEvent<{ scrollTop: number }>): void {
    const se = this.ionScrollEl;
    const scrollTop = event.detail?.scrollTop ?? se?.scrollTop ?? 0;
    this.dispatch(scrollTop, se?.clientHeight ?? 0, se?.scrollHeight ?? 0);
  }

  private dispatch(scrollTop: number, clientHeight: number, scrollHeight: number): void {
    const atBottom =
      scrollHeight > 0 && scrollTop + clientHeight >= scrollHeight - this.BOTTOM_ZONE;
    if (this.noShrink) {
      this.scrollSvc.reportNoShrink(scrollTop, atBottom);
    } else {
      this.scrollSvc.report(scrollTop, atBottom);
    }
  }
}
