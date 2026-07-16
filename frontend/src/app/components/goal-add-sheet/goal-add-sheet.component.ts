import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { Goal, GoalIcon } from '../../services/goals.service';

/**
 * Add-a-goal bottom sheet — FRED-216.
 *
 * Presented via ModalController with cssClass 'mc-bottom-sheet-modal'.
 * When the user taps "Track this goal", dismisses with role 'saved' and the
 * new goal data (without id — GoalsService assigns the id on save).
 *
 * When in edit mode (editGoal input provided), pre-populates fields and
 * dismisses with role 'updated' + the full updated Goal (with id).
 *
 * Keyboard avoidance: the modal sits above the main ion-content stack, so
 * the global focusin handler in app.component.ts (web fallback) covers it.
 * The mc-bottom-sheet-modal CSS class sets position:fixed bottom sheet chrome.
 */
@Component({
  selector: 'app-goal-add-sheet',
  templateUrl: './goal-add-sheet.component.html',
  styleUrls: ['./goal-add-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class GoalAddSheetComponent implements OnInit {
  /** Provide to pre-populate fields for editing an existing goal. */
  @Input() editGoal: Goal | null = null;

  // ── Fields ─────────────────────────────────────────────────────────────────
  goalName: string = '';
  selectedIcon: GoalIcon = 'flag';
  targetAmount: number | null = null;
  targetYear: number | null = null;
  monthlyOutsideFRED: number | null = null;

  // ── Icon palette ───────────────────────────────────────────────────────────
  readonly iconOptions: Array<{ icon: GoalIcon; label: string }> = [
    { icon: 'home',                label: 'Home'        },
    { icon: 'health_and_safety',   label: 'Health'      },
    { icon: 'flag',                label: 'Goal'        },
    { icon: 'balance',             label: 'Balance'     },
    { icon: 'energy_savings_leaf', label: 'Green'       },
    { icon: 'school',              label: 'Education'   },
    { icon: 'directions_car',      label: 'Vehicle'     },
    { icon: 'savings',             label: 'Savings'     },
  ];

  // ── Icon-driven placeholders ───────────────────────────────────────────────
  // Example values swap with the selected icon so the empty form reads like a
  // real goal of that type. Record<GoalIcon, …> so a new icon can't ship
  // without example copy.
  private static readonly ICON_PLACEHOLDERS: Record<
    GoalIcon,
    { name: string; amount: string; year: string; monthly: string }
  > = {
    home:                { name: 'House down payment', amount: '60,000', year: '2030', monthly: '550' },
    health_and_safety:   { name: 'Emergency fund',     amount: '15,000', year: '2027', monthly: '250' },
    flag:                { name: 'Dream vacation',     amount: '8,000',  year: '2027', monthly: '200' },
    balance:             { name: 'Pay off debt',       amount: '12,000', year: '2028', monthly: '350' },
    energy_savings_leaf: { name: 'Solar panels',       amount: '18,000', year: '2029', monthly: '250' },
    school:              { name: 'College fund',       amount: '40,000', year: '2035', monthly: '300' },
    directions_car:      { name: 'New car',            amount: '25,000', year: '2029', monthly: '400' },
    savings:             { name: 'Rainy day fund',     amount: '20,000', year: '2031', monthly: '250' },
  };

  get placeholders(): { name: string; amount: string; year: string; monthly: string } {
    return GoalAddSheetComponent.ICON_PLACEHOLDERS[this.selectedIcon]
      ?? GoalAddSheetComponent.ICON_PLACEHOLDERS['flag'];
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  nameError: string = '';
  amountError: string = '';
  yearError: string = '';
  monthlyError: string = '';

  constructor(private modalController: ModalController) {}

  ngOnInit(): void {
    if (this.editGoal) {
      this.goalName = this.editGoal.name;
      this.selectedIcon = this.editGoal.icon;
      this.targetAmount = this.editGoal.targetAmount;
      this.targetYear = this.editGoal.targetYear;
      this.monthlyOutsideFRED = this.editGoal.monthlyOutsideFRED;
    }
  }

  get isEditing(): boolean {
    return this.editGoal != null;
  }

  selectIcon(icon: GoalIcon): void {
    this.selectedIcon = icon;
  }

  close(): void {
    this.modalController.dismiss();
  }

  save(): void {
    if (!this._validate()) return;

    const payload: Omit<Goal, 'id'> = {
      name: this.goalName.trim(),
      icon: this.selectedIcon,
      targetAmount: this.targetAmount!,
      targetYear: this.targetYear!,
      monthlyOutsideFRED: this.monthlyOutsideFRED!,
    };

    if (this.isEditing) {
      this.modalController.dismiss(
        { ...payload, id: this.editGoal!.id } as Goal,
        'updated'
      );
    } else {
      this.modalController.dismiss(payload, 'saved');
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _validate(): boolean {
    this.nameError = '';
    this.amountError = '';
    this.yearError = '';
    this.monthlyError = '';

    let valid = true;
    const currentYear = new Date().getFullYear();

    if (!this.goalName || !this.goalName.trim()) {
      this.nameError = 'Enter a goal name.';
      valid = false;
    }

    if (!this.targetAmount || this.targetAmount <= 0) {
      this.amountError = 'Enter a target amount greater than $0.';
      valid = false;
    }

    if (!this.targetYear || this.targetYear < currentYear) {
      this.yearError = `Enter a year from ${currentYear} onward.`;
      valid = false;
    }

    if (this.monthlyOutsideFRED == null || this.monthlyOutsideFRED < 0) {
      this.monthlyError = 'Enter a monthly saving amount (can be $0).';
      valid = false;
    }

    if (this.monthlyOutsideFRED === 0 && this.targetAmount && this.targetAmount > 0) {
      // Allow $0/mo but warn the user; projection will show "late" (infinite months).
      // Not a hard error — user may be tracking a lump-sum goal.
    }

    return valid;
  }
}
