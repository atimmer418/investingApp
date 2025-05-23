import { IonicModule } from '@ionic/angular'
import { Component, OnInit } from '@angular/core'; // Added OnInit
import { Router, RouterModule } from '@angular/router'; // Added Router
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [
    IonicModule,
    CommonModule,
    RouterModule,
  ],
  standalone: true,
  // styleUrls: ['./app.component.scss'] // Assuming app.component.scss might exist or be added later
})
export class AppComponent implements OnInit { // Implemented OnInit
  constructor(private router: Router) {} // Injected Router

  ngOnInit(): void {
    const surveyCompleted = localStorage.getItem('surveyCompleted');
    if (surveyCompleted === 'true') {
      this.router.navigate(['/portfolio']);
    } else {
      // If the default route in app.module.ts is already '/survey',
      // explicit navigation might be redundant but ensures behavior.
      // If the user lands on a different path somehow, this will correct it.
      this.router.navigate(['/survey']);
    }
  }
}
