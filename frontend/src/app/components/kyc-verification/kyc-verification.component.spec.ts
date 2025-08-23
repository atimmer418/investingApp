import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { KycVerificationComponent } from './kyc-verification.component';
import { KycService } from '../../services/kyc.service';

describe('KycVerificationComponent', () => {
  let component: KycVerificationComponent;
  let fixture: ComponentFixture<KycVerificationComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockKycService: jasmine.SpyObj<KycService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {};
    mockKycService = jasmine.createSpyObj('KycService', [
      'getVerificationStatus',
      'startVerification',
      'submitVerificationResult'
    ]);

    // Set up default mock returns
    mockKycService.getVerificationStatus.and.returnValue(
      of({ hasVerification: false, message: 'No verification found' })
    );
    mockKycService.startVerification.and.returnValue(
      of({ referenceId: 'KYC-TEST123', status: 'pending', message: 'Started' })
    );

    await TestBed.configureTestingModule({
      imports: [KycVerificationComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: KycService, useValue: mockKycService }
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

  it('should call KYC service on verification start', () => {
    component.startVerification();
    expect(mockKycService.startVerification).toHaveBeenCalled();
  });
});