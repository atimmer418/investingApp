import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IncomeSelectionComponent } from './income-selection.component';

describe('IncomeSelectionComponent', () => {
  let component: IncomeSelectionComponent;
  let fixture: ComponentFixture<IncomeSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IncomeSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});