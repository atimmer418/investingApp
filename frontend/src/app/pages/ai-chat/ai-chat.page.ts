import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
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
    IonBackButton, 
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
  ]
})
export class AiChatPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  
  messages: ChatMessage[] = [];
  sessions: ChatSession[] = [];
  currentSession: ChatSession | null = null;
  newMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) { 
    addIcons({ arrowUpCircle, menuOutline, addOutline });
  }

  ngOnInit() {
    this.loadSessions();
    this.syncBackendHistory();
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
    this.currentSession = this.chatService.createSession();
    this.messages = [];
    // Add an initial greeting from FRED
    this.addMessage({
      role: 'assistant',
      content: "Hello! I'm FRED. How can I help you with your investing journey today?",
      timestamp: new Date()
    }, false); // Don't save just yet
  }

  loadSession(session: ChatSession) {
    console.log('Loading session:', session.id);
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
      if (msg.role === 'user' && this.messages.filter(m => m.role === 'user').length === 1) {
        this.currentSession.title = msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : '');
      }
      
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

    this.chatService.sendMessage(userMsg)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.scrollToBottom();
      }))
      .subscribe({
        next: (response) => {
          if (response && response.reply) {
            this.addMessage({
              role: 'assistant',
              content: response.reply,
              timestamp: new Date()
            });
          }
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.addMessage({
            role: 'assistant',
            content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
            timestamp: new Date()
          });
        }
      });
  }

  scrollToBottom() {
    setTimeout(() => {
      this.content.scrollToBottom(300);
    }, 100);
  }
  
  // Helper to format markdown-like text (basic implementation)
  // In a real app, you might use a library like marked or ngx-markdown
  formatMessage(content: string): string {
    // Basic bold formatting
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Basic list formatting
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }
}
