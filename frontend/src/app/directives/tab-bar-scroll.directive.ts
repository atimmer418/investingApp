import { Directive, ElementRef, HostListener, OnInit, inject } from '@angular/core';
import { TabBarScrollService } from '../services/tab-bar-scroll.service';

/**
 * Attach to a tab's real scroll container so the floating tab bar shrinks on
 * scroll-down and grows on scroll-up. Works on <ion-content> (shadow-DOM scroll,
 * via ionScroll) and on plain overflow-scrolling elements (native scroll).
 */
@Directive({
  selector: '[appTabBarScroll]',
  standalone: true,
})
export class TabBarScrollDirective implements OnInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly scrollSvc = inject(TabBarScrollService);

  ngOnInit(): void {
    const node = this.el.nativeElement;
    if (node.tagName === 'ION-CONTENT') {
      // ion-content scrolls inside its shadow DOM; opt into scroll events.
      (node as unknown as { scrollEvents: boolean }).scrollEvents = true;
    }
  }

  /** Native scroll (plain elements such as div.content-scroll). */
  @HostListener('scroll', ['$event'])
  onNativeScroll(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target) {
      this.scrollSvc.report(target.scrollTop);
    }
  }

  /** Ionic scroll (ion-content). */
  @HostListener('ionScroll', ['$event'])
  onIonScroll(event: CustomEvent<{ scrollTop: number }>): void {
    this.scrollSvc.report(event.detail?.scrollTop ?? 0);
  }
}
