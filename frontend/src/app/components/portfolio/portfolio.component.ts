import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  imports: [CommonModule],
  // styleUrls: ['./portfolio.component.scss'] // Assuming no specific styles for now
})
export class PortfolioComponent {
  constructor(private router: Router) {}

  retakeSurvey(): void {
    localStorage.removeItem('surveyCompleted'); // Clear the flag
    this.router.navigate(['/survey']); // Navigate back to the survey
  }
}
