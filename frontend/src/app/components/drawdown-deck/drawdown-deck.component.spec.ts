import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController } from '@ionic/angular/standalone';
import { DrawdownDeckComponent } from './drawdown-deck.component';
import { PortfolioStoreService } from '../../services/portfolio-store.service';

function makeBundle(portfolioValue: number) {
  return { dashboard: { summary: { portfolioValue } }, performance: [], history: null } as any;
}

describe('DrawdownDeckComponent', () => {
  let fixture: ComponentFixture<DrawdownDeckComponent>;
  let component: DrawdownDeckComponent;
  let modalCtrl: jasmine.SpyObj<ModalController>;
  let store: jasmine.SpyObj<PortfolioStoreService>;
  const KEY = 'fred.mcOutside.42';

  beforeEach(() => {
    localStorage.removeItem(KEY);
    modalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);
    store = jasmine.createSpyObj('PortfolioStoreService', ['load$']);
    store.load$.and.returnValue(of(makeBundle(84200)));

    TestBed.configureTestingModule({
      imports: [DrawdownDeckComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrl },
        { provide: PortfolioStoreService, useValue: store },
      ],
    });

    fixture = TestBed.createComponent(DrawdownDeckComponent);
    component = fixture.componentInstance;
    component.userId = '42';
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('renders the 2-slide deck with drawdown eyebrows', () => {
    fixture.detectChanges();
    const dots = fixture.nativeElement.querySelectorAll('.deck-dots span');
    expect(dots.length).toBe(2);
    const eyebrows = fixture.nativeElement.querySelectorAll('.sl-eyebrow');
    expect(eyebrows.length).toBe(2);
    expect(eyebrows[0].textContent).toContain('OPTIMAL DRAWDOWN · 1 OF 2');
    expect(eyebrows[1].textContent).toContain('OPTIMAL DRAWDOWN · 2 OF 2');
  });

  it('maps dashboard + localStorage balances into bucket chips and hides the hint', () => {
    localStorage.setItem(KEY, JSON.stringify({ k401: 250000, roth: 80000 }));
    fixture.detectChanges();
    expect(component.chip('fred')).toBe('$84k');
    expect(component.chip('k401')).toBe('$250k');
    expect(component.chip('roth')).toBe('$80k');
    expect(component.hasOutside).toBeTrue();
    expect(fixture.nativeElement.querySelector('.bs-hint')).toBeNull();
  });

  it('formats millions with one decimal', () => {
    store.load$.and.returnValue(of(makeBundle(1_240_000)));
    fixture.detectChanges();
    expect(component.chip('fred')).toBe('$1.2M');
  });

  it('shows em-dash chips and the hint when nothing is available', () => {
    store.load$.and.returnValue(throwError(() => new Error('backend down')));
    fixture.detectChanges();
    expect(component.chip('fred')).toBe('—');
    expect(component.chip('k401')).toBe('—');
    expect(component.chip('roth')).toBe('—');
    expect(component.hasOutside).toBeFalse();
    expect(fixture.nativeElement.querySelector('.bs-hint')).toBeTruthy();
  });

  it('treats zero and corrupt outside balances as not entered', () => {
    localStorage.setItem(KEY, JSON.stringify({ k401: 0, roth: 0 }));
    fixture.detectChanges();
    expect(component.hasOutside).toBeFalse();

    localStorage.setItem(KEY, '{not-json');
    const f2 = TestBed.createComponent(DrawdownDeckComponent);
    f2.componentInstance.userId = '42';
    f2.detectChanges();
    expect(f2.componentInstance.hasOutside).toBeFalse();
  });

  it('dismisses with the right roles', () => {
    fixture.detectChanges();
    component.stressTest();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'stress-test');
    component.done();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'done');
    component.dismiss();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('includes the tax-advisor disclaimer', () => {
    fixture.detectChanges();
    const warn = fixture.nativeElement.querySelector('.warn-card');
    expect(warn.textContent).toContain('not tax advice');
    expect(warn.textContent).toContain('qualified tax advisor');
  });
});
