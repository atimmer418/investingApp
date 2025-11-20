import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private activeToasts: HTMLIonToastElement[] = [];
  private readonly TOAST_SPACING = 6; // px
  private readonly TOAST_HEIGHT = 50; // Approximate height, tighter for standard messages

  constructor(private toastController: ToastController) {}

  async showToast(message: string, color: string = 'primary', duration: number = 4500) {
    // Create the new toast
    const toast = await this.toastController.create({
      message: message,
      duration: duration,
      color: color,
      position: 'top',
      cssClass: 'stacked-toast',
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    // Add to our tracking array immediately so we can adjust positions
    this.activeToasts.push(toast);
    
    // Calculate position based on index in the stack
    // Move existing toasts down BEFORE presenting the new one to avoid overlap
    this.updateToastPositions();

    // Present the toast
    await toast.present();

    // Handle dismissal
    toast.onDidDismiss().then(() => {
      this.removeToast(toast);
    });
  }

  private removeToast(toast: HTMLIonToastElement) {
    const index = this.activeToasts.indexOf(toast);
    if (index > -1) {
      this.activeToasts.splice(index, 1);
      this.updateToastPositions();
    }
  }

  private updateToastPositions() {
    // We need to manually adjust the top position of each toast
    // Newest toast (last in array) should be at the top (offset 0)
    // Older toasts should cascade down
    
    this.activeToasts.forEach((toast, index) => {
      // Calculate position from top (0 = newest/bottom of array)
      const positionFromTop = this.activeToasts.length - 1 - index;
      
      const offset = positionFromTop * (this.TOAST_HEIGHT + this.TOAST_SPACING);
      
      toast.style.setProperty('--toast-transform', `translateY(${offset}px)`);
      toast.style.setProperty('transition', 'transform 0.3s ease-in-out');
      
      // Optional: Fade out older toasts slightly to emphasize the new one
      if (positionFromTop > 0) {
        toast.style.opacity = '0.9';
      } else {
        toast.style.opacity = '1';
      }
    });
  }
}
