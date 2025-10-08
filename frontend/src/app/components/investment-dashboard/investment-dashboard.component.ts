import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvestmentService, InvestmentDashboard } from '../../services/investment.service';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
  IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonCardHeader,
  IonCardTitle, IonSpinner, IonItem, IonLabel, IonBadge
} from "@ionic/angular/standalone";

@Component({
  selector: 'app-investment-dashboard',
  templateUrl: './investment-dashboard.component.html',
  styleUrls: ['./investment-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
    IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonCardHeader,
    IonCardTitle, IonSpinner, IonItem, IonLabel, IonBadge
  ]
})
export class InvestmentDashboardComponent implements OnInit {
  dashboard: InvestmentDashboard | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private investmentService: InvestmentService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  async loadDashboard() {
    this.loading = true;
    this.error = null;

    try {
      const result = await this.investmentService.getDashboard().toPromise();
      this.dashboard = result || null;
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      this.error = error.error?.message || 'Failed to load investment dashboard';
    } finally {
      this.loading = false;
    }
  }

  async onRefresh(event: any) {
    await this.loadDashboard();
    // event.target.complete() tells Ionic that the refresh operation is done
    // This hides the pull-to-refresh spinner and resets the refresher state
    event.target.complete();
  }

  async createManualInvestment() {
    const alert = await this.alertController.create({
      header: 'Manual Investment',
      message: 'Enter the amount you want to invest now:',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          placeholder: 'Amount ($)',
          min: 1,
          max: 10000
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Invest',
          handler: (data) => {
            if (data.amount && data.amount > 0) {
              this.executeManualInvestment(parseFloat(data.amount));
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async executeManualInvestment(amount: number) {
    const loading = await this.loadingController.create({
      message: 'Creating investment...'
    });
    await loading.present();

    try {
      await this.investmentService.createManualInvestment(amount).toPromise();
      
      const toast = await this.toastController.create({
        message: `Manual investment of $${amount} created successfully!`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Reload dashboard to show new investment
      await this.loadDashboard();
    } catch (error: any) {
      console.error('Error creating manual investment:', error);
      
      const toast = await this.toastController.create({
        message: error.error?.message || 'Failed to create investment',
        duration: 5000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async updateInvestmentSettings() {
    if (!this.dashboard) return;

    const alert = await this.alertController.create({
      header: 'Investment Settings',
      message: 'Update your investment schedule:',
      inputs: [
        {
          name: 'monthlyInvestment',
          type: 'number',
          placeholder: 'Monthly Amount ($)',
          value: this.dashboard.monthlyInvestment,
          min: 1,
          max: 10000
        },
        {
          name: 'payFrequency',
          type: 'text',
          placeholder: 'Pay Frequency (WEEKLY, BIWEEKLY, MONTHLY)',
          value: this.dashboard.payFrequency
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: (data) => {
            this.saveInvestmentSettings(data);
          }
        }
      ]
    });

    await alert.present();
  }

  async saveInvestmentSettings(settings: any) {
    const loading = await this.loadingController.create({
      message: 'Updating settings...'
    });
    await loading.present();

    try {
      await this.investmentService.updateInvestmentSchedule({
        monthlyInvestment: parseFloat(settings.monthlyInvestment),
        payFrequency: settings.payFrequency.toUpperCase()
      }).toPromise();
      
      const toast = await this.toastController.create({
        message: 'Investment settings updated successfully!',
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Reload dashboard to show updated settings
      await this.loadDashboard();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      
      const toast = await this.toastController.create({
        message: error.error?.message || 'Failed to update settings',
        duration: 5000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  getStatusDisplayText(status: string): string {
    return this.investmentService.getStatusDisplayText(status);
  }

  getStatusColor(status: string): string {
    return this.investmentService.getStatusColor(status);
  }

  isStatusInProgress(status: string): boolean {
    return this.investmentService.isStatusInProgress(status);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
