
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SurveyComponent } from './survey.component';

// Define interfaces directly in spec for clarity, or import if they are in a separate file
interface Option {
  text: string;
  score: number;
}

interface Question {
  questionText: string;
  options: Option[];
}

describe('SurveyComponent', () => {
  let component: SurveyComponent;
  let fixture: ComponentFixture<SurveyComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let localStorageSpy: jasmine.Spy;

  // Access private 'allQuestions' for testing purposes if needed for length comparisons
  // This is generally not recommended for strict unit testing but useful here as it's part of component's setup logic
  const allQuestionsLength = 7; // Based on the hardcoded questions in survey.component.ts

  beforeEach(async () => {
    // Create a spy object for Router with a 'navigate' method
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [SurveyComponent],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyComponent);
    component = fixture.componentInstance;
    localStorageSpy = spyOn(localStorage, 'setItem').and.callThrough(); // Spy on localStorage.setItem
    fixture.detectChanges(); // Triggers ngOnInit
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load survey questions on init', () => {
      expect(component.surveyQuestions.length).toBe(allQuestionsLength);
      expect(component.currentQuestionIndex).toBe(0);
      expect(component.totalScore).toBe(0);
    });

    it('currentQuestion getter should return the first question after init', () => {
      expect(component.currentQuestion).toEqual(component.surveyQuestions[0]);
    });

    it('should call loadSurvey on ngOnInit', () => {
      spyOn(component, 'loadSurvey').and.callThrough();
      component.ngOnInit();
      expect(component.loadSurvey).toHaveBeenCalled();
    });
  });

  describe('selectAnswer(option)', () => {
    let testOption: Option;

    beforeEach(() => {
      testOption = { text: 'Test Option', score: 5 };
      spyOn(component, 'nextQuestion').and.callThrough(); // Spy on nextQuestion
    });

    it('should update totalScore correctly based on selected option score', () => {
      component.selectAnswer(testOption);
      expect(component.totalScore).toBe(testOption.score);
    });

    it('should call nextQuestion', () => {
      component.selectAnswer(testOption);
      expect(component.nextQuestion).toHaveBeenCalled();
    });

    it('should not do anything if currentQuestion is null (though unlikely in normal flow)', () => {
        component.surveyQuestions = []; // Make currentQuestion null
        component.currentQuestionIndex = 0;
        fixture.detectChanges(); // Recalculate currentQuestion
        
        const initialScore = component.totalScore;
        component.selectAnswer(testOption);
        expect(component.totalScore).toBe(initialScore);
        expect(component.nextQuestion).not.toHaveBeenCalled();
      });
  });

  describe('nextQuestion()', () => {
    it('should increment currentQuestionIndex', () => {
      component.nextQuestion();
      expect(component.currentQuestionIndex).toBe(1);
    });

    it('currentQuestion getter should update to the next question', () => {
      component.nextQuestion();
      expect(component.currentQuestion).toEqual(component.surveyQuestions[1]);
    });

    it('should call navigateToResults when all questions are answered', () => {
      spyOn(component, 'navigateToResults').and.callThrough();
      // Simulate answering all questions
      for (let i = 0; i < allQuestionsLength; i++) {
        component.nextQuestion(); // This will call navigateToResults on the last one
      }
      expect(component.navigateToResults).toHaveBeenCalled();
    });

     it('should handle being called when currentQuestionIndex is already at the end', () => {
      spyOn(component, 'navigateToResults').and.callThrough();
      component.currentQuestionIndex = component.surveyQuestions.length; // Manually set to end
      component.nextQuestion(); // Call it again
      // navigateToResults would have been called once due to setting index, ensure it's called again or handled.
      // Depending on implementation, it might be called twice or might have a guard.
      // Current implementation calls it again.
      expect(component.navigateToResults).toHaveBeenCalled();
    });
  });

  describe('navigateToResults()', () => {
    beforeEach(() => {
      component.totalScore = 15; // Example score
      component.navigateToResults();
    });

    it('should call localStorage.setItem with surveyCompleted and true', () => {
      expect(localStorageSpy).toHaveBeenCalledWith('surveyCompleted', 'true');
    });

    it('should call router.navigate with the correct route and query parameters', () => {
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/survey-results'],
        { queryParams: { score: component.totalScore } }
      );
    });
  });

  describe('currentQuestion getter', () => {
    it('should return null if surveyQuestions is empty', () => {
      component.surveyQuestions = [];
      expect(component.currentQuestion).toBeNull();
    });

    it('should return null if currentQuestionIndex is out of bounds', () => {
      component.currentQuestionIndex = component.surveyQuestions.length; // Index out of bounds
      expect(component.currentQuestion).toBeNull();
    });
  });

});
