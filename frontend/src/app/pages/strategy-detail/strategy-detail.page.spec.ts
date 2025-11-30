import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StrategyDetailPage } from './strategy-detail.page';

describe('StrategyDetailPage', () => {
  let component: StrategyDetailPage;
  let fixture: ComponentFixture<StrategyDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StrategyDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
