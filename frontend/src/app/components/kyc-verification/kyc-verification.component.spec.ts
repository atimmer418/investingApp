import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { KycVerificationComponent } from './kyc-verification.component';

describe('KycVerificationComponent', () => {
  let component: KycVerificationComponent;
  let fixture: ComponentFixture<KycVerificationComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      queryParamMap: of(new Map([
        ['plan', 'test-plan'],
        ['t', '10'],
        ['p', '500000'],
        ['rI', '50000'],
        ['mI', '2000']
      ]))
    };

    await TestBed.configureTestingModule({
      imports: [KycVerificationComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KycVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct parameters', () => {
    expect(component.hasRequiredParams).toBe(true);
    expect(component.planId).toBe('test-plan');
    expect(component.timeToFI).toBe('10');
    expect(component.targetPortfolio).toBe(500000);
    expect(component.retirementIncome).toBe(50000);
    expect(component.monthlyInvestment).toBe(2000);
  });

  it('should set loading state when starting verification', () => {
    component.startVerification();
    expect(component.isLoading).toBe(true);
    expect(component.errorMessage).toBe(null);
    expect(component.successMessage).toBe(null);
  });
});