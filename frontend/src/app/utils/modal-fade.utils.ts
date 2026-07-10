import { createAnimation } from '@ionic/angular/standalone';

/**
 * Builds a fade animation for an Ionic ModalController modal.
 *
 * WKWebView lesson (FRED-207): the shadow .modal-wrapper baseline is
 * opacity 0.01 + iOS translateY(100%). The enter animation MUST drive both
 * opacity AND transform (translateY(0px)) on the wrapper keyframes — an
 * opacity-only animation leaves the modal invisible on device even though the
 * backdrop dims correctly.
 *
 * @param baseEl     - The root element Ionic passes to enter/leaveAnimation.
 * @param durationMs - Animation duration in milliseconds.
 */
export function buildFade(baseEl: HTMLElement, durationMs: number) {
  const root       = baseEl.shadowRoot ?? baseEl;
  const backdropEl = root.querySelector('ion-backdrop');
  const wrapperEl  = root.querySelector('.modal-wrapper');
  const parts: ReturnType<typeof createAnimation>[] = [];

  if (backdropEl) {
    parts.push(
      createAnimation()
        .addElement(backdropEl)
        .fromTo('opacity', '0.01', 'var(--backdrop-opacity)')
    );
  }

  if (wrapperEl) {
    parts.push(
      createAnimation()
        .addElement(wrapperEl)
        .keyframes([
          { offset: 0, opacity: '0',    transform: 'translateY(0px)' },
          { offset: 1, opacity: '0.99', transform: 'translateY(0px)' },
        ])
    );
  }

  return createAnimation()
    .addElement(baseEl)
    .easing('ease-out')
    .duration(durationMs)
    .addAnimation(parts);
}
