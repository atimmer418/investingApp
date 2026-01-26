import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuController } from '@ionic/angular';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonFooter,
  IonTextarea,
  IonButton,
  IonIcon,
  IonMenu,
  IonList,
  IonItem,
  IonLabel,
  IonMenuToggle,
  IonMenuButton,
  IonChip
} from '@ionic/angular/standalone';
import { ChatService, ChatMessage, ChatSession } from '../../services/chat.service';
import { finalize } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { arrowUpCircle, menuOutline, addOutline } from 'ionicons/icons';

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.page.html',
  styleUrls: ['./ai-chat.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonFooter,
    IonTextarea,
    IonButton,
    IonIcon,
    IonMenu,
    IonList,
    IonItem,
    IonLabel,
    IonMenuToggle,
    IonMenuButton,
    IonChip
  ]
})
export class AiChatPage implements OnInit, AfterViewInit {
  @ViewChild(IonContent) content!: IonContent;

  readonly FRED_STORY_TRIGGER = "What's your story FRED?";

  messages: ChatMessage[] = [];
  sessions: ChatSession[] = [];
  currentSession: ChatSession | null = null;
  newMessage: string = '';
  isLoading: boolean = false;
  dailySuggestions: string[] = [];
  isActive: boolean = true; // Default to true to ensure it works on reload/entry

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private menuCtrl: MenuController
  ) {
    addIcons({ arrowUpCircle, menuOutline, addOutline });
  }

  ngOnInit() {
    console.log('ngOnInit called');
    this.loadSessions();
    this.syncBackendHistory();
    this.loadDailySuggestions();
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit called');
    // Give time for async operations to complete and populate messages
    setTimeout(() => {
      if (this.messages.length > 0) {
        console.log('Scrolling to bottom from ngAfterViewInit, messages count:', this.messages.length);
        this.scrollToBottom();
      }
    }, 300);
  }

  ionViewDidEnter() {
    this.isActive = true;
    // Scroll to bottom if there are existing messages
    if (this.messages.length > 0) {
      setTimeout(() => this.scrollToBottom(), 300);
    }
    console.log('ionViewDidEnter');
  }

  ionViewWillLeave() {
    this.isActive = false;
  }

  loadDailySuggestions() {
    this.chatService.getDailySuggestions().subscribe({
      next: (questions) => {
        const used = this.chatService.getUsedSuggestions();
        const available = questions.filter(q => !used.includes(q));
        this.updateDailySuggestions(available);
      },
      error: (err) => {
        console.error('Failed to load daily questions', err);
        this.updateDailySuggestions([]);
      }
    });
  }

  private updateDailySuggestions(baseSuggestions: string[]) {
    // Check if user has read Fred's story
    const hasReadStory = localStorage.getItem('has_read_fred_story');
    if (!hasReadStory) {
      // ensure we have space for it (max 3 usually)
      if (baseSuggestions.length >= 3) {
        baseSuggestions.pop(); // Remove the last random one to make space
      }
      // Add as the LAST item for visibility
      baseSuggestions.push(this.FRED_STORY_TRIGGER);
    }
    this.dailySuggestions = baseSuggestions;
    this.cdr.detectChanges();
  }

  selectSuggestion(question: string) {
    this.newMessage = question;
    this.chatService.markSuggestionAsUsed(question);

    // If it's the Fred story trigger, mark as read
    if (question === this.FRED_STORY_TRIGGER) {
      localStorage.setItem('has_read_fred_story', 'true');
    }

    this.dailySuggestions = this.dailySuggestions.filter(q => q !== question);
    this.sendMessage();
  }

  syncBackendHistory() {
    this.isLoading = true;
    this.chatService.getHistory().subscribe({
      next: (history) => {
        this.isLoading = false;
        if (history && history.length > 0) {
          // Convert backend messages to frontend format
          const backendMessages: ChatMessage[] = history.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt)
          }));

          // Check if the last message is recent (within 2 hours)
          const lastMsg = backendMessages[backendMessages.length - 1];
          const now = new Date();
          const diffHours = (now.getTime() - lastMsg.timestamp.getTime()) / (1000 * 60 * 60);

          if (diffHours < 2) {
            console.log('Found recent backend history, loading it.');
            // Create a session for this history or update current
            // For simplicity, let's overwrite the current "new" session with this history
            this.messages = backendMessages;

            // If we have a current session (which might be empty/new), update it
            if (this.currentSession) {
              this.currentSession.messages = this.messages;
              this.currentSession.lastModified = lastMsg.timestamp.getTime();
              // Try to set a title if not set
              if (this.currentSession.title === 'New Chat') {
                const firstUserMsg = this.messages.find(m => m.role === 'user');
                if (firstUserMsg) {
                  this.currentSession.title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
                }
              }
              this.chatService.saveSession(this.currentSession);
            } else {
              // Should have been created by checkRecentSession -> startNewChat, but just in case
              this.startNewChat();
              this.currentSession!.messages = this.messages;
              this.chatService.saveSession(this.currentSession!);
            }
            this.cdr.detectChanges();
            setTimeout(() => this.scrollToBottom(), 100);
          } else {
            // If not recent, we still might want to ensure it's saved in history?
            // For now, let's respect the "recent session" logic of the UI.
            // If local storage didn't have it, we could add it, but user asked specifically about "loading into current chat window"
            this.checkRecentSession();
          }
        } else {
          this.checkRecentSession();
        }
      },
      error: (err) => {
        console.error('Failed to fetch history', err);
        this.isLoading = false;
        this.checkRecentSession();
      }
    });
  }

  loadSessions() {
    this.sessions = this.chatService.getSessions();
    this.cdr.detectChanges();
  }

  checkRecentSession() {
    const recent = this.chatService.getRecentSession();
    if (recent) {
      console.log('Found recent session:', recent.id);
      this.loadSession(recent);
    } else {
      console.log('No recent session found, starting new chat');
      this.startNewChat();
    }
  }

  startNewChat() {
    this.menuCtrl.close('chat-menu');
    this.currentSession = this.chatService.createSession();
    this.messages = [];
    // Reload suggestions to ensure used ones are filtered out
    this.loadDailySuggestions();

    // Add an initial greeting from FRED
    this.addMessage({
      role: 'assistant',
      content: "Hello! I'm FRED. How can I help you with your investing journey today?",
      timestamp: new Date()
    }, false); // Don't save just yet
  }

  loadSession(session: ChatSession) {
    console.log('Loading session:', session.id);
    this.menuCtrl.close('chat-menu');
    this.currentSession = session;
    // Create a copy of messages to ensure change detection runs
    this.messages = [...session.messages];
    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 100);
  }

  addMessage(msg: ChatMessage, save: boolean = true) {
    this.messages.push(msg);
    if (this.currentSession) {
      this.currentSession.messages = this.messages;
      this.currentSession.lastModified = Date.now();

      // Update title if it's the first user message
      // if (msg.role === 'user' && this.messages.filter(m => m.role === 'user').length === 1) {
      //   this.currentSession.title = msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : '');
      // }

      if (save) {
        this.chatService.saveSession(this.currentSession);
        this.loadSessions(); // Refresh list
      }
    }
    this.cdr.detectChanges();
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const userMsg = this.newMessage.trim();
    this.addMessage({
      role: 'user',
      content: userMsg,
      timestamp: new Date()
    });

    this.newMessage = '';
    this.isLoading = true;
    this.scrollToBottom();

    // Check if we need to generate a title (first user message in session)
    const isFirstUserMessage = this.messages.filter(m => m.role === 'user').length === 1;

    this.chatService.sendMessage(userMsg, isFirstUserMessage)
      .pipe(finalize(() => {
        this.isLoading = false;
        // Navigation handled in next/error callbacks
      }))
      .subscribe({
        next: (response) => {
          if (response && response.reply) {
            this.addMessage({
              role: 'assistant',
              content: response.reply,
              timestamp: new Date()
            });

            // Scroll to the top of the new assistant message
            this.scrollToMessage(this.messages.length - 1);

            // Update title if provided by LLM
            if (response.title && this.currentSession) {
              this.currentSession.title = response.title;
              this.chatService.saveSession(this.currentSession);
              this.loadSessions();
            }
          }
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.addMessage({
            role: 'assistant',
            content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
            timestamp: new Date()
          });
          this.scrollToMessage(this.messages.length - 1);
        }
      });
  }

  scrollToMessage(index: number) {
    if (!this.isActive) return;

    // Use native scrollIntoView which is robust enough to find the scroll parent
    setTimeout(() => {
      const element = document.getElementById(`chat-message-${index}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback if element not found in DOM yet
        console.warn('Message element not found for index:', index);
      }
    }, 300); // Increased timeout to ensure rendering completion
  }

  scrollToBottom() {
    if (!this.content) return;

    setTimeout(() => {
      const anchor = document.getElementById('scroll-anchor');
      if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  // Helper to format markdown-like text (basic implementation)
  // In a real app, you might use a library like marked or ngx-markdown
  formatMessage(content: string): string {
    // Basic bold formatting
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Basic italics formatting
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Basic list formatting
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }
}
