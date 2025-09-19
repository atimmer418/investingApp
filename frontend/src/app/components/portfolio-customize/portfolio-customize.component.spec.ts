import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PortfolioCustomizeComponent } from './portfolio-customize.component';

describe('PortfolioCustomizeComponent', () => {
  let component: PortfolioCustomizeComponent;
  let fixture: ComponentFixture<PortfolioCustomizeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PortfolioCustomizeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioCustomizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});