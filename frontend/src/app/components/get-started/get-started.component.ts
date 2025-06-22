import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, IonButton, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone'; // Removed IonSlide as it's not a standalone import for slides content
// For IonSlides, individual IonSlide elements are part of the IonSlides structural directive.

// If you are using Swiper directly (which IonSlides v7+ uses)
// import SwiperCore, { Pagination } from 'swiper';
// SwiperCore.use([Pagination]);
// However, for basic usage, IonSlides handles this internally.

@Component({
  selector: 'app-get-started',
  templateUrl: './get-started.component.html',
  styleUrls: ['./get-started.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    // IonSlide is not typically imported directly here for standalone components,
    // it's used as a child tag within IonSlides' template.
    IonButton,
    // IonHeader, IonToolbar, IonTitle // Only if you add a header to this component
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GetStartedComponent implements OnInit {

  // Optional: Access IonSlides programmatically if needed
  // @ViewChild(IonSlides) slides: IonSlides | undefined;

  // Slide options for ion-slides
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    // centeredSlides: true, // Uncomment if you want slides to be centered if not taking full width
    // loop: false, // Set to true if you want looping
    // spaceBetween: 10 // Optional space between slides
  };

  constructor(private router: Router) { }

  ngOnInit() {
    // Component initialization logic can go here
    console.log('GetStartedComponent initialized');
  }

  startInvesting() {
    // TODO: Implement navigation to the next step in the onboarding funnel (e.g., survey or sign-up)
    console.log('Start Investing clicked');
    // Example: this.router.navigate(['/survey']);
  }

  learnMore() {
    // TODO: Implement navigation to a dedicated "Learn More" page or show a modal
    console.log('Learn How It Works clicked');
    // Example: this.router.navigate(['/learn-more']);
  }

  getSetUp() {
    // TODO: Implement navigation to the initial setup/profile creation if different from 'Start Investing'
    console.log('Get Set Up clicked');
    localStorage.setItem('getStartedCompleted', 'true');
    this.router.navigate(['/survey'], {
      replaceUrl: true
    }); 
  }

  // Optional: If you need to interact with slides programmatically
  // nextSlide() {
  //   this.slides?.slideNext();
  // }

  // prevSlide() {
  //   this.slides?.slidePrev();
  // }
}
