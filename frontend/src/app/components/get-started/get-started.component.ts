import { Component, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import type { SwiperContainer } from 'swiper/element';
import type { Swiper } from 'swiper';

@Component({
  selector: 'app-get-started',
  templateUrl: './get-started.component.html',
  styleUrls: ['./get-started.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GetStartedComponent implements AfterViewInit {
  // Use ViewChild to get a reference to the swiper element
  @ViewChild('swiper') swiperRef: ElementRef<SwiperContainer> | undefined;

  isLastSlide = false;

  constructor(private router: Router) { }

  ngAfterViewInit() {
    const swiperEl = this.swiperRef?.nativeElement;

    if (!swiperEl) return;

    // Register progress event
    swiperEl.addEventListener('swiperprogress', (event: any) => {
      const [swiper, progress] = event.detail;

      if (progress === 1) {
        this.isLastSlide = true;
      } else {
        this.isLastSlide = false;
      }
    });
  }

  // --- No longer need onSlideChange() or checkSlideStatus() ---

  getSetUp() {
    localStorage.setItem('getStartedCompleted', 'true');
    this.router.navigate(['/survey'], { replaceUrl: true });
  }
}