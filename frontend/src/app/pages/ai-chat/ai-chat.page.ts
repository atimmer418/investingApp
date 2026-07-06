import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
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
  IonMenuButton
} from '@ionic/angular/standalone';
import { ChatService, ChatMessage, ChatSession } from '../../services/chat.service';
import { FirstTimeTourService } from '../../services/first-time-tour.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { arrowUp, menuOutline, addOutline, refreshOutline, sparklesOutline, trendingUpOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import { TabBarScrollDirective } from '../../directives/tab-bar-scroll.directive';
import { KeyboardAvoidDirective } from '../../directives/keyboard-avoid.directive';
import { Keyboard } from '@capacitor/keyboard';

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
    TabBarScrollDirective,
    KeyboardAvoidDirective
  ]
})
export class AiChatPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;

  readonly FRED_STORY_TRIGGER = "What's your story FRED?";

  private streamSubscription: Subscription | null = null;

  /** Keyboard height (px) while the native keyboard is up — lifts the composer (resize:'none'). */
  keyboardOffset = 0;
  private kbShow?: Promise<any>;
  private kbHide?: Promise<any>;

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
    private menuCtrl: MenuController,
    private tourService: FirstTimeTourService
  ) {
    addIcons({ arrowUp, menuOutline, addOutline, refreshOutline, sparklesOutline, trendingUpOutline, chatbubbleEllipsesOutline });
  }

  get isTourOnStep4(): boolean {
    return this.tourService.currentStep === 4;
  }

  /** Empty state = no user message yet in this chat (hero + suggestion cards shown) */
  get isEmptyState(): boolean {
    return !this.messages.some(m => m.role === 'user');
  }

  get timeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 17) return 'Good afternoon.';
    return 'Good evening.';
  }

  private readonly suggestionIcons = ['sparkles-outline', 'trending-up-outline', 'chatbubble-ellipses-outline'];

  suggestionIcon(index: number): string {
    return this.suggestionIcons[index % this.suggestionIcons.length];
  }

  /** Pig-themed thinking phrases — one picked at random per response */
  private readonly thinkingPhrases = [
    'Snorting...',
    'Rolling around in some mud...',
    'Rooting through the numbers...',
    'Counting coins in the trough...',
    'Sniffing out an answer...',
    'Filling the piggy bank...',
    'Oinking at the market...'
  ];
  thinkingPhrase = this.thinkingPhrases[0];

  private pickThinkingPhrase() {
    this.thinkingPhrase = this.thinkingPhrases[Math.floor(Math.random() * this.thinkingPhrases.length)];
  }

  ngOnInit() {
    this.loadSessions();
    this.syncBackendHistory();
    this.loadDailySuggestions();

    // Native-only (plugin never fires on web — same pattern as KeyboardAvoidDirective)
    this.kbShow = Keyboard.addListener('keyboardWillShow', info => {
      this.keyboardOffset = info.keyboardHeight;
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
    this.kbHide = Keyboard.addListener('keyboardWillHide', () => {
      this.keyboardOffset = 0;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.kbShow?.then(h => h.remove());
    this.kbHide?.then(h => h.remove());
    this.streamSubscription?.unsubscribe();
  }

  ngAfterViewInit() {
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
  }

  ionViewWillLeave() {
    this.isActive = false;
  }

  loadDailySuggestions() {
    this.chatService.getDailySuggestions().subscribe({
      next: (questions) => {
        // Phase 3: Backend returns [LLM, Popular, Personalized/FRED]
        // Filter out used questions from positions 1 & 2 (static until midnight)
        // Keep position 3 (personalized) always visible - backend handles rotation

        const used = this.chatService.getUsedSuggestions();
        const filteredQuestions = questions.filter(q => !used.includes(q));

        this.dailySuggestions = filteredQuestions;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load daily questions', err);
        this.dailySuggestions = [];
        this.cdr.detectChanges();
      }
    });
  }

  selectSuggestion(question: string) {
    // If tour is on step 4 and this is the story chip, complete the tour
    if (this.isTourOnStep4 && question === this.FRED_STORY_TRIGGER) {
      this.tourService.completeTour();
    }

    this.newMessage = question;

    // Mark as used to hide static questions on next load
    this.chatService.markSuggestionAsUsed(question);

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
    // Only show sessions that have at least one user message
    this.sessions = this.chatService.getSessions().filter(s =>
      s.messages && s.messages.some(m => m.role === 'user')
    );
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

    // If already in a new chat that hasn't been started, just return
    if (this.currentSession?.title === 'New Chat') {
      return;
    }

    this.currentSession = this.chatService.createSession();
    this.messages = [];
    // Reload suggestions to ensure used ones are filtered out
    this.loadDailySuggestions();
    // No greeting bubble — the empty-state hero (pig + time greeting) takes its place
    this.cdr.detectChanges();
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

      // Only save to history if we have at least one user message
      const hasUserMessage = this.messages.some(m => m.role === 'user');

      if (save && hasUserMessage) {
        this.chatService.saveSession(this.currentSession);
        this.loadSessions(); // Refresh list
      }
    }
    this.cdr.detectChanges();
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const userMsg = this.newMessage.trim();
    const userMsgIndex = this.messages.length;

    this.addMessage({
      role: 'user',
      content: userMsg,
      timestamp: new Date(),
      failed: false
    });

    this.newMessage = '';
    this.isLoading = true;
    this.pickThinkingPhrase();
    this.scrollToBottom();

    // Check if we need to generate a title (first user message in session)
    const isFirstUserMessage = this.messages.filter(m => m.role === 'user').length === 1;

    const sessionId = this.currentSession?.id || 'default-session';

    // Push placeholder assistant message
    const assistantMsgIndex = this.messages.length;
    this.addMessage({ role: 'assistant', content: '', timestamp: new Date() });
    this.cdr.detectChanges();
    this.scrollToBottom();

    // Cancel any in-flight stream
    if (this.streamSubscription) {
      this.streamSubscription.unsubscribe();
      this.streamSubscription = null;
    }

    this.streamSubscription = this.chatService.streamChat(userMsg, sessionId, isFirstUserMessage)
      .subscribe({
        next: (event) => {
          if (event.token) {
            // Turn off loading indicator on first token
            if (this.isLoading) {
              this.isLoading = false;
            }
            this.messages[assistantMsgIndex].content += event.token;
            this.cdr.detectChanges();
          }
          if (event.done) {
            this.isLoading = false;
            if (event.title && this.currentSession) {
              this.currentSession.title = event.title;
              this.chatService.saveSession(this.currentSession);
              this.loadSessions();
            }
            this.cdr.detectChanges();
            this.scrollToMessage(assistantMsgIndex);
          }
        },
        error: (err) => {
          console.error('[Chat] Stream error:', err);
          this.isLoading = false;
          if (this.messages[userMsgIndex]) {
            this.messages[userMsgIndex].failed = true;
          }
          this.messages[assistantMsgIndex].content = "I'm sorry, I'm having trouble connecting right now. Please try again.";
          this.cdr.detectChanges();
          this.scrollToMessage(assistantMsgIndex);
        },
        complete: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
          this.scrollToMessage(assistantMsgIndex);
        }
      });
  }

  retryMessage(index: number) {
    const failedMsg = this.messages[index];
    if (!failedMsg || failedMsg.role !== 'user' || !failedMsg.failed) return;

    // Remove the failed message and the error response after it
    this.messages.splice(index, 2); // Remove failed user message and error assistant message

    // Update session
    if (this.currentSession) {
      this.currentSession.messages = this.messages;
      this.chatService.saveSession(this.currentSession);
    }

    this.cdr.detectChanges();

    // Resend the message
    this.newMessage = failedMsg.content;
    this.sendMessage();
  }

  scrollToMessage(index: number) {
    if (!this.isActive) return;

    setTimeout(() => {
      const messageWrapper = document.getElementById(`chat-message-${index}`);
      if (!messageWrapper) return;

      // Find the message-bubble div (the actual bubble with text)
      const messageBubble = messageWrapper.querySelector('.message-bubble') as HTMLElement;

      if (messageBubble) {
        // Scroll to the message bubble (not the wrapper with avatar)
        messageBubble.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback to wrapper
        messageWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
