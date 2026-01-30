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
    const userId = localStorage.getItem('userId');
    const sessionId = this.currentSession?.id;

    if (!sessionId && !userId) {
      this.checkRecentSession();
      return;
    }

    this.isLoading = true;
    this.chatService.getHistory(sessionId, userId).subscribe({
      next: (history) => {
        this.isLoading = false;
        if (history && history.length > 0) {
          // Convert backend messages to frontend format
          const backendMessages: ChatMessage[] = history.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
            sessionId: m.sessionId // Capture sessionId from messages
          }));

          const lastMsg = backendMessages[backendMessages.length - 1];
          const now = new Date();
          const diffHours = (now.getTime() - lastMsg.timestamp.getTime()) / (1000 * 60 * 60);

          // Use the sessionId from the backend history if we didn't have one
          const activeSessionId = sessionId || lastMsg.sessionId;

          if (diffHours < 2) {
            console.log('Found recent session, loading it:', activeSessionId);
            this.messages = backendMessages;

            // Update or Create session locally
            let session = this.sessions.find(s => s.id === activeSessionId);
            if (!session) {
              session = {
                id: activeSessionId!,
                title: 'Resumed Chat',
                lastModified: lastMsg.timestamp.getTime(),
                messages: this.messages
              };
            } else {
              session.messages = this.messages;
              session.lastModified = lastMsg.timestamp.getTime();
            }

            // Generate title if default
            if (activeSessionId && (session.title === 'Resumed Chat' || session.title === 'New Chat')) {
              const firstUserMsg = this.messages.find(m => m.role === 'user');
              if (firstUserMsg) {
                session.title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
              }
            }

            this.currentSession = session;
            this.chatService.saveSession(session);
            this.loadSessions();
            this.cdr.detectChanges();
            setTimeout(() => this.scrollToBottom(), 100);
          } else {
            // History found but too old
            this.checkRecentSession();
          }
        } else {
          // No history found on backend
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
    }, true); // Save the initial greeting
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

    const sessionId = this.currentSession?.id || 'default-session';

    this.chatService.sendMessage(userMsg, sessionId, isFirstUserMessage)
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
            this.cdr.detectChanges();
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

    setTimeout(() => {
      const element = document.getElementById(`chat-message-${index}`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // If message is "big enough" (e.g. > 35% of viewport), scroll to top
      // Otherwise scroll to bottom to see everything
      if (rect.height > viewportHeight * 0.35) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        this.scrollToBottom();
      }
    }, 300);
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

  // Auto-scroll textarea to bottom when typing
  onTextareaInput(event: any) {
    // Use setTimeout to ensure the DOM has updated with the new content
    setTimeout(() => {
      const ionTextarea = event.target?.closest('ion-textarea');
      if (ionTextarea) {
        // Scroll the ion-textarea host element (which has overflow-y: auto)
        // Not the native textarea inside (which has overflow: hidden)
        if (ionTextarea.scrollHeight > ionTextarea.clientHeight) {
          ionTextarea.scrollTop = ionTextarea.scrollHeight;
        }
      }
    }, 0);
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
