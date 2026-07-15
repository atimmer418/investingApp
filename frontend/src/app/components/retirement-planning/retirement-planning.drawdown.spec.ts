import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ModalController } from '@ionic/angular/standalone';
import { RetirementPlanningComponent } from './retirement-planning.component';
import { DrawdownDeckComponent } from '../drawdown-deck/drawdown-deck.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SimulationHistoryService } from '../../services/simulation-history.service';

describe('RetirementPlanningComponent — drawdown orchestration', () => {
  let fixture: ComponentFixture<RetirementPlanningComponent>;
  let component: RetirementPlanningComponent;
  let modalCtrl: jasmine.SpyObj<ModalController>;
  let toast: jasmine.SpyObj<ToastService>;
  let progress$: BehaviorSubject<any>;

  /** Mock fullscreen modal whose onDidDismiss resolves with the given role. */
  function makeModal(role: string | undefined) {
    return {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role })),
    } as any;
  }

  beforeEach(() => {
    progress$ = new BehaviorSubject<any>({ selectedTier: 'pro' });
    modalCtrl = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    toast = jasmine.createSpyObj('ToastService', ['showToast']);

    TestBed.configureTestingModule({
      imports: [RetirementPlanningComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrl },
        { provide: ToastService, useValue: toast },
        {
          provide: AuthService,
          useValue: {
            userProgress$: progress$.asObservable(),
            getCurrentUserId: jasmine.createSpy('getCurrentUserId').and.returnValue(42),
          },
        },
        {
          provide: SimulationHistoryService,
          useValue: { getHistory: jasmine.createSpy('getHistory').and.returnValue([]) },
        },
      ],
    });

    fixture = TestBed.createComponent(RetirementPlanningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit — subscribes tier, loads history
  });

  it('passes the current tier into the strategy deck', fakeAsync(() => {
    modalCtrl.create.and.returnValue(Promise.resolve(makeModal(undefined)));
    component.openStrategyDeck('yield');
    tick(700);
    expect(modalCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: jasmine.objectContaining({ strategyKey: 'yield', userTier: 'pro' }),
    }));
    flush();
  }));

  it('role drawdown opens the drawdown deck with the userId', fakeAsync(() => {
    modalCtrl.create.and.returnValues(
      Promise.resolve(makeModal('drawdown')),
      Promise.resolve(makeModal(undefined)),
    );
    component.openStrategyDeck('yield');
    tick(700);
    expect(modalCtrl.create).toHaveBeenCalledTimes(2);
    const secondCall = modalCtrl.create.calls.argsFor(1)[0] as any;
    expect(secondCall.component).toBe(DrawdownDeckComponent);
    expect(secondCall.cssClass).toBe('mc-fullscreen-modal');
    expect(secondCall.componentProps).toEqual({ userId: '42' });
    flush();
  }));

  it('role upgrade routes to upgradeToPlusClicked', fakeAsync(() => {
    spyOn(component, 'upgradeToPlusClicked');
    modalCtrl.create.and.returnValue(Promise.resolve(makeModal('upgrade')));
    component.openStrategyDeck('yield');
    tick(700);
    expect(component.upgradeToPlusClicked).toHaveBeenCalled();
    flush();
  }));

  it('drawdown deck stress-test switches on outside accounts and lands on the simulator', fakeAsync(() => {
    component.includeOutsideAccts = false;
    component.setSelectedSection('education');
    modalCtrl.create.and.returnValue(Promise.resolve(makeModal('stress-test')));
    component.openDrawdownDeck();
    tick(700);
    expect(component.includeOutsideAccts).toBeTrue();
    expect(component.selectedSection).toBe('simulator');
    expect(toast.showToast).toHaveBeenCalled();
    flush();
  }));

  it('drawdown deck done role changes nothing', fakeAsync(() => {
    component.includeOutsideAccts = false;
    component.setSelectedSection('education');
    modalCtrl.create.and.returnValue(Promise.resolve(makeModal('done')));
    component.openDrawdownDeck();
    tick(700);
    expect(component.includeOutsideAccts).toBeFalse();
    expect(component.selectedSection).toBe('education');
    flush();
  }));

  it('releases the drawdown lock when modal creation fails', fakeAsync(() => {
    modalCtrl.create.and.returnValues(
      Promise.reject(new Error('create failed')),
      Promise.resolve(makeModal(undefined)),
    );
    component.openDrawdownDeck().catch(() => { /* rejection propagates by design */ });
    tick();
    component.openDrawdownDeck();
    tick(700);
    expect(modalCtrl.create).toHaveBeenCalledTimes(2);
    flush();
  }));
});
