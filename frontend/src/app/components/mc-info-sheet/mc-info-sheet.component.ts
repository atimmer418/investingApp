import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';

/**
 * Bottom-sheet content for the Monte Carlo landing, presented via
 * ModalController (cssClass 'mc-bottom-sheet-modal') so it renders at the
 * app root — above the header and tab bar — instead of being contained by
 * the component's inner ion-content (which clips position:fixed on iOS).
 *
 * mode 'assumptions' — market assumptions & methodology disclosure
 * mode 'nudge'       — Piggy Pro upgrade nudge (Plus users tapping Pro chips)
 *
 * Dismisses with role 'upgrade' when the nudge CTA is tapped; the presenter
 * decides what upgrading means.
 */
@Component({
  selector: 'app-mc-info-sheet',
  templateUrl: './mc-info-sheet.component.html',
  styleUrls: ['./mc-info-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class McInfoSheetComponent {
  @Input() mode: 'assumptions' | 'nudge' = 'assumptions';

  constructor(private modalController: ModalController) {}

  close(): void {
    this.modalController.dismiss();
  }

  upgrade(): void {
    this.modalController.dismiss(null, 'upgrade');
  }
}
