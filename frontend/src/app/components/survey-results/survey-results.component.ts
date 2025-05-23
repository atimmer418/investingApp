import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-survey-results',
  templateUrl: './survey-results.component.html',
  imports: [CommonModule],
  // styleUrls: ['./survey-results.component.scss'] // Assuming no specific styles for now
})
export class SurveyResultsComponent implements OnInit {
  score: string | null = null;
  riskProfile: string = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.score = this.route.snapshot.queryParamMap.get('score');
    this.determineRiskProfile();
  }

  determineRiskProfile(): void {
    const numericScore = Number(this.score);
    if (isNaN(numericScore) || this.score === null) {
      this.riskProfile = 'Could not determine risk profile due to invalid or missing score.';
      return;
    }

    // Max score for 7 questions, each max 4 points = 28
    // Min score for 7 questions, each min 1 point = 7
    if (numericScore <= 10) { // Approx <35% of max score (7-10)
      this.riskProfile = 'Conservative';
    } else if (numericScore <= 17) { // Approx 35-60% (11-17)
      this.riskProfile = 'Moderate';
    } else if (numericScore <= 24) { // Approx 60-85% (18-24)
      this.riskProfile = 'Growth-Oriented';
    } else { // Approx >85% (25-28)
      this.riskProfile = 'Aggressive';
    }
  }

  continueToApp(): void {
    this.router.navigate(['/portfolio']);
  }
}
