import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { KycVerificationComponent } from './kyc-verification.component';

describe('KycVerificationComponent', () => {
  let component: KycVerificationComponent;
  let fixture: ComponentFixture<KycVerificationComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {};

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

  it('should initialize with default state', () => {
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(null);
    expect(component.successMessage).toBe(null);
  });

  it('should set loading state when starting verification', () => {
    component.startVerification();
    expect(component.isLoading).toBe(true);
    expect(component.errorMessage).toBe(null);
    expect(component.successMessage).toBe(null);
  });
});