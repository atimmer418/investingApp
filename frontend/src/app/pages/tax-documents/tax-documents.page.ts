import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PortfolioService } from '../../services/portfolio.service';
import { LoadingController } from '@ionic/angular';
import { ToastService } from '../../services/toast.service';
import { addIcons } from 'ionicons';
import { documentTextOutline, documentAttachOutline, downloadOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tax-documents',
  templateUrl: './tax-documents.page.html',
  styleUrls: ['./tax-documents.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class TaxDocumentsPage implements OnInit {
  documents: any[] = [];
  loading = true;

  constructor(
    private portfolioService: PortfolioService,
    private loadingController: LoadingController,
    private toastService: ToastService
  ) {
    addIcons({ documentTextOutline, documentAttachOutline, downloadOutline });
  }

  ngOnInit() {
    this.loadDocuments();
  }

  async loadDocuments() {
    this.loading = true;

    // Calculate date range: Last 12 months
    // This ensures we always capture the most recent tax document (generated in Feb)
    // even if it's early in the new year (e.g., Jan 1st)
    const now = new Date();
    const end = now.toISOString().split('T')[0]; // Today

    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const start = oneYearAgo.toISOString().split('T')[0]; // One year ago

    this.portfolioService.getTaxDocuments(start, end).subscribe({
      next: (docs) => {
        // Filter out trade confirmations, keep only tax documents (account_statement, tax_form, etc.)
        this.documents = (docs || []).filter(doc => 
          !doc.type.includes('trade_confirmation')
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading documents', err);
        this.loading = false;
      }
    });
  }

  async download(doc: any) {
    const loading = await this.loadingController.create({
      message: 'Downloading...'
    });
    await loading.present();

    this.portfolioService.downloadDocument(doc.id).subscribe({
      next: (blob) => {
        loading.dismiss();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use document type and date for filename
        const dateStr = doc.date || new Date().toISOString().split('T')[0];
        a.download = `tax_document_${dateStr}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: async (err) => {
        loading.dismiss();
        await this.toastService.showToast('Failed to download document', 'danger', 2000);
      }
    });
  }
}
