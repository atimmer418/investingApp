import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { StrategyDeckComponent } from './strategy-deck.component';
import { ToastService } from '../../services/toast.service';
import { McInfoSheetComponent } from '../mc-info-sheet/mc-info-sheet.component';

describe('StrategyDeckComponent — Optimal Drawdown gate', () => {
  let fixture: ComponentFixture<StrategyDeckComponent>;
  let component: StrategyDeckComponent;
  let modalCtrl: jasmine.SpyObj<ModalController>;

  /** Mock bottom-sheet modal whose onDidDismiss resolves with the given role. */
  function makeSheet(role: string | undefined) {
    return {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role })),
    } as any;
  }

  beforeEach(() => {
    modalCtrl = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    TestBed.configureTestingModule({
      imports: [StrategyDeckComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrl },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['showToast']) },
      ],
    });
    fixture = TestBed.createComponent(StrategyDeckComponent);
    component = fixture.componentInstance;
  });

  it('shows the PRO chip on the drawdown button for non-pro users', () => {
    component.userTier = null;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.sl-drawdown');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Discover the Optimal Drawdown');
    expect(btn.querySelector('.deck-lockchip')).toBeTruthy();
  });

  it('hides the PRO chip for pro users', () => {
    component.userTier = 'pro';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sl-drawdown .deck-lockchip')).toBeNull();
  });

  it('pro tap dismisses the deck with role drawdown and never presents a nudge', fakeAsync(() => {
    component.userTier = 'pro';
    fixture.detectChanges();
    component.discoverDrawdown();
    tick();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'drawdown');
    expect(modalCtrl.create).not.toHaveBeenCalled();
  }));

  it('non-pro tap presents the Piggy Pro nudge over the deck; maybe-later keeps the deck open', fakeAsync(() => {
    component.userTier = null;
    fixture.detectChanges();
    modalCtrl.create.and.returnValue(Promise.resolve(makeSheet(undefined))); // close() → no role
    component.discoverDrawdown();
    tick(700); // drain the nudgeLock timer
    expect(modalCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({
      component: McInfoSheetComponent,
      cssClass: 'mc-bottom-sheet-modal',
      componentProps: jasmine.objectContaining({
        mode: 'nudge',
        nudgeTitle: 'Unlock the Optimal Drawdown',
        targetTier: 'pro',
      }),
    }));
    expect(modalCtrl.dismiss).not.toHaveBeenCalled();
  }));

  it('nudge upgrade dismisses the deck with role upgrade', fakeAsync(() => {
    component.userTier = null;
    fixture.detectChanges();
    modalCtrl.create.and.returnValue(Promise.resolve(makeSheet('upgrade')));
    component.discoverDrawdown();
    tick(700);
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'upgrade');
  }));

  it('releases the nudge lock when sheet creation fails', fakeAsync(() => {
    component.userTier = null;
    fixture.detectChanges();
    modalCtrl.create.and.returnValues(
      Promise.reject(new Error('create failed')),
      Promise.resolve(makeSheet(undefined)),
    );
    component.discoverDrawdown().catch(() => { /* rejection propagates by design */ });
    tick();
    component.discoverDrawdown();
    tick(700);
    expect(modalCtrl.create).toHaveBeenCalledTimes(2);
  }));

  it('plus tier is gated like null tier (pro only)', () => {
    component.userTier = 'plus';
    fixture.detectChanges();
    expect(component.isPro).toBeFalse();
    expect(fixture.nativeElement.querySelector('.sl-drawdown .deck-lockchip')).toBeTruthy();
  });
});
