import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
    chevronDownOutline,
    chevronUpOutline,
    helpCircleOutline,
    arrowBackOutline,
    walletOutline,
    timeOutline,
    calendarOutline,
    documentTextOutline,
    shieldCheckmarkOutline,
    informationCircleOutline,
    businessOutline
} from 'ionicons/icons';

interface FaqItem {
    question: string;
    answer: string;
    isOpen: boolean;
    icon: string;
}

@Component({
    selector: 'app-faq',
    templateUrl: './faq.page.html',
    styleUrls: ['./faq.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule]
})
export class FaqPage implements OnInit {

    faqs: FaqItem[] = [
        {
            question: 'When will my sales go through?',
            answer: 'Sales are executed during standard market hours (9:30 AM - 4:00 PM ET on business days). If you place a sell order outside these hours, it will be queued and executed promptly at the next market open.',
            isOpen: false,
            icon: 'time-outline'
        },
        {
            question: 'How long for buying power to become settled cash?',
            answer: 'Typically, trade settlement takes 1 business day after the trade date (T+1). Once settled, the funds become "Available to Withdraw". You can see this status in your portfolio dashboard.',
            isOpen: false,
            icon: 'wallet-outline'
        },
        {
            question: 'Does the schedule keep my selected day?',
            answer: 'Yes! We always aim to execute on your exact preferred day. If that day falls on a weekend or market holiday, we simply shift that specific investment to the next available business day. Your future investments will stay on your original schedule.',
            isOpen: false,
            icon: 'calendar-outline'
        },
        {
            question: 'How do taxes work and how do I report them?',
            answer: 'As with any brokerage account, you are responsible for reporting capital gains and dividends. We (via our partner Alpaca) will generate a consolidated Form 1099 by mid-February each year. You can download this document directly from the app to use for your tax filing.',
            isOpen: false,
            icon: 'document-text-outline'
        },
        {
            question: 'What is FRED doing exactly?',
            answer: 'FRED is your automated investment pilot. We handle the complex logic of recurring trades, portfolio rebalancing, and strategy execution. We partner with Alpaca Securities to securely hold your assets and execute the actual trades, ensuring your money is handled by a regulated custodian.',
            isOpen: false,
            icon: 'information-circle-outline'
        },
        {
            question: 'Is my money safe?',
            answer: 'Your brokerage account is held with Alpaca Securities LLC, a member of SIPC, which protects securities customers of its members up to $500,000 (including $250,000 for claims for cash). FRED uses bank-level encryption to secure your data.',
            isOpen: false,
            icon: 'shield-checkmark-outline'
        },
        {
            question: 'What type of account do I get with Alpaca through FRED?',
            answer: 'Your Alpaca account through FRED is set up as a margin account, which legally gives you access to features like same-day settlement and extended trading hours. However, the margin borrowing feature is disabled by default since most FRED users don\'t need it. This setup provides you with the benefits of a margin account (faster settlement) without the risks of margin trading, keeping your investment strategy simple and safe.',
            isOpen: false,
            icon: 'business-outline'
        }
    ];

    constructor(private router: Router) {
        addIcons({
            chevronDownOutline,
            chevronUpOutline,
            helpCircleOutline,
            arrowBackOutline,
            walletOutline,
            timeOutline,
            calendarOutline,
            documentTextOutline,
            shieldCheckmarkOutline,
            informationCircleOutline,
            businessOutline
        });
    }

    ngOnInit() {
    }

    toggleSection(index: number) {
        // Toggle the clicked section
        const wasOpen = this.faqs[index].isOpen;

        // Close all sections first (accordion behavior)
        this.faqs.forEach(faq => faq.isOpen = false);

        // If it wasn't open before, open it now
        if (!wasOpen) {
            this.faqs[index].isOpen = true;
        }
    }

    goBack() {
        this.router.navigate(['/tabs/tab3']);
    }
}
