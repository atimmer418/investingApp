import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { addIcons } from 'ionicons';
import { close, download, shareOutline } from 'ionicons/icons';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.mjs';

@Component({
  selector: 'app-pdf-viewer-modal',
  templateUrl: './pdf-viewer-modal.component.html',
  styleUrls: ['./pdf-viewer-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, PdfViewerModule]
})
export class PdfViewerModalComponent implements OnInit {
  @Input() pdfBlob!: Blob;
  @Input() documentTitle: string = 'Document';
  
  pdfSrc: Uint8Array | undefined;
  isLoading = true;
  loadError = false;

  constructor(private modalController: ModalController) {
    addIcons({ close, download, shareOutline });
  }

  ngOnInit() {
    this.loadPdf();
  }

  async loadPdf() {
    try {
      console.log('Loading PDF from blob, size:', this.pdfBlob.size, 'type:', this.pdfBlob.type);
      
      // Convert blob to ArrayBuffer then to Uint8Array for pdf.js
      const arrayBuffer = await this.pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('Converted to Uint8Array, length:', uint8Array.length);
      
      // Check if it starts with PDF magic bytes (%PDF-)
      const header = String.fromCharCode(...uint8Array.slice(0, 5));
      console.log('PDF header:', header);
      
      if (!header.startsWith('%PDF-')) {
        console.error('Invalid PDF format - missing %PDF- header');
        // Try to log the first 100 bytes as text to see what we actually received
        const preview = String.fromCharCode(...uint8Array.slice(0, Math.min(100, uint8Array.length)));
        console.log('File preview:', preview);
        this.loadError = true;
        this.isLoading = false;
        return;
      }
      
      this.pdfSrc = uint8Array;
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.loadError = true;
      this.isLoading = false;
    }
  }

  onPdfLoaded() {
    console.log('PDF loaded successfully');
    this.isLoading = false;
  }

  onPdfError(error: any) {
    console.error('PDF load error:', error);
    this.loadError = true;
    this.isLoading = false;
  }

  close() {
    this.modalController.dismiss();
  }

  downloadPdf() {
    // Create download link
    const url = window.URL.createObjectURL(this.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.documentTitle}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async sharePdf() {
    // Use Web Share API if available (mobile)
    if (navigator.share) {
      try {
        const file = new File([this.pdfBlob], `${this.documentTitle}.pdf`, { type: 'application/pdf' });
        await navigator.share({
          files: [file],
          title: this.documentTitle,
          text: 'Tax Document'
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback to download on desktop
      this.downloadPdf();
    }
  }
}
