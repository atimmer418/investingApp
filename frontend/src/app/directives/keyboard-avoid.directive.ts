import { Directive, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Keeps the focused form field visible above the iOS soft keyboard.
 *
 * Apply to an <ion-content> that contains text inputs:
 *   <ion-content appKeyboardAvoid> ... </ion-content>
 *   <ion-content [appKeyboardAvoid]="'.form-field'"> ... </ion-content>
 *
 * On the Capacitor (native) build the keyboard overlays the webview without
 * shrinking it, so scrollIntoView alone fails for bottom fields. This directive
 * uses the real keyboard height to add scroll room and scroll by the exact
 * overshoot. On web the Keyboard plugin never fires, so this is a no-op and the
 * global focusin fallback in app.component.ts handles it.
 */
@Directive({
  selector: '[appKeyboardAvoid]',
  standalone: true,
})
export class KeyboardAvoidDirective implements OnInit, OnDestroy {
  /** Optional wrapper selector to bring the whole labeled field (incl. validation
   *  text below the input) into view. Falls back to the focused element. */
  @Input('appKeyboardAvoid') wrapperSelector = '';

  /** Gap (px) kept between the field bottom and the keyboard top. */
  @Input() keyboardAvoidMargin = 16;

  private keyboardHeight = 0;
  private scrollEl?: HTMLElement;
  private kbShow?: Promise<any>;
  private kbHide?: Promise<any>;

  constructor(private content: IonContent) {}

  async ngOnInit(): Promise<void> {
    // Cache the scroll element once; the keyboard listeners then just toggle padding.
    this.scrollEl = await this.content.getScrollElement();

    this.kbShow = Keyboard.addListener('keyboardWillShow', info => {
      this.keyboardHeight = info.keyboardHeight;
      if (this.scrollEl) this.scrollEl.style.paddingBottom = `${info.keyboardHeight}px`;
    });
    this.kbHide = Keyboard.addListener('keyboardWillHide', () => {
      this.keyboardHeight = 0;
      if (this.scrollEl) this.scrollEl.style.paddingBottom = '';
    });
  }

  @HostListener('focusin', ['$event'])
  async onFocusIn(event: FocusEvent): Promise<void> {
    const el = event.target as HTMLElement;
    if (!el?.matches('input, select, textarea')) return;
    await new Promise(r => setTimeout(r, 300)); // let the keyboard finish animating in
    if (!this.keyboardHeight) return;            // web / no keyboard -> no-op

    const fieldEl =
      (this.wrapperSelector && (el.closest(this.wrapperSelector) as HTMLElement)) || el;
    const rect = fieldEl.getBoundingClientRect();
    const visibleBottom = window.innerHeight - this.keyboardHeight - this.keyboardAvoidMargin;
    const overshoot = rect.bottom - visibleBottom;
    if (overshoot > 0) (this.content as any).scrollByPoint(0, overshoot, 150);
  }

  ngOnDestroy(): void {
    this.kbShow?.then(h => h.remove());
    this.kbHide?.then(h => h.remove());
  }
}
