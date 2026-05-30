import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Observer } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId?: string;
  failed?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  lastModified: number;
  messages: ChatMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.backendApiUrl}/chat`;
  private readonly STORAGE_KEY = 'fred_chat_history';
  private readonly SESSION_TIMEOUT_HOURS = 2;

  constructor(private http: HttpClient) { }

  sendMessage(message: string, sessionId: string, generateTitle: boolean = false): Observable<{ reply: string, title?: string }> {
    const token = JwtTokenUtils.getValidJwtToken();
    const userId = localStorage.getItem('userId');

    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const body = {
      message: message,
      userId: userId ? parseInt(userId, 10) : null,
      sessionId: sessionId,
      generateTitle: generateTitle
    };

    return this.http.post<{ reply: string, title?: string }>(this.apiUrl, body, { headers });
  }

  streamChat(message: string, sessionId: string, generateTitle: boolean = false): Observable<{token?: string, done?: boolean, title?: string}> {
    const token = JwtTokenUtils.getValidJwtToken();
    const userId = localStorage.getItem('userId');

    const params = new URLSearchParams({ message, sessionId, generateTitle: generateTitle.toString() });
    if (userId) params.set('userId', userId);

    const headers: Record<string, string> = { 'Accept': 'text/event-stream' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return new Observable((observer: Observer<{token?: string, done?: boolean, title?: string}>) => {
      let cancelled = false;

      fetch(`${this.apiUrl}/stream?${params.toString()}`, { headers, signal: undefined })
        .then(response => {
          if (!response.ok || !response.body) {
            observer.error(new Error(`HTTP ${response.status}`));
            return;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          const pump = (): Promise<void> => {
            if (cancelled) return Promise.resolve();
            return reader.read().then(({ done, value }) => {
              if (done) { observer.complete(); return; }
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                try {
                  const parsed = JSON.parse(data);
                  observer.next(parsed);
                  if (parsed.done) { observer.complete(); return; }
                } catch { /* skip malformed */ }
              }
              return pump();
            });
          };

          pump().catch(err => { if (!cancelled) observer.error(err); });
        })
        .catch(err => { if (!cancelled) observer.error(err); });

      return () => { cancelled = true; };
    });
  }

  getHistory(sessionId?: string, userId?: string | null): Observable<any[]> {
    const token = JwtTokenUtils.getValidJwtToken();
    let queryParams = '';

    if (sessionId) {
      queryParams = `?sessionId=${sessionId}`;
    } else if (userId) {
      queryParams = `?userId=${userId}`;
    }

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<any[]>(`${this.apiUrl}/history${queryParams}`, { headers });
  }

  getDailySuggestions(): Observable<string[]> {
    const token = JwtTokenUtils.getValidJwtToken();
    const userId = localStorage.getItem('userId');

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Include userId for personalized questions (Phase 3)
    const userIdParam = userId ? `?userId=${userId}` : '';
    return this.http.get<string[]>(`${this.apiUrl}/suggestions${userIdParam}`, { headers });
  }

  // History Management
  getSessions(): ChatSession[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return [];
    try {
      const sessions = JSON.parse(data);
      // Restore Date objects
      return sessions.map((s: any) => ({
        ...s,
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      })).sort((a: ChatSession, b: ChatSession) => b.lastModified - a.lastModified);
    } catch (e) {
      console.error('Error parsing chat history', e);
      return [];
    }
  }

  saveSession(session: ChatSession): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  deleteSession(id: string): void {
    let sessions = this.getSessions();
    sessions = sessions.filter(s => s.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  createSession(): ChatSession {
    return {
      id: this.generateId(),
      title: 'New Chat',
      lastModified: Date.now(),
      messages: []
    };
  }

  getRecentSession(): ChatSession | null {
    const sessions = this.getSessions();
    if (sessions.length === 0) return null;

    const lastSession = sessions[0];
    const now = Date.now();
    const diffHours = (now - lastSession.lastModified) / (1000 * 60 * 60);

    if (diffHours < this.SESSION_TIMEOUT_HOURS) {
      return lastSession;
    }
    return null;
  }

  // Daily Suggestions Persistence
  markSuggestionAsUsed(question: string): void {
    const today = new Date().toISOString().split('T')[0];
    const key = `fred_used_suggestions_${today}`;
    const used = this.getUsedSuggestions();

    if (!used.includes(question)) {
      used.push(question);
      localStorage.setItem(key, JSON.stringify(used));
    }
  }

  getUsedSuggestions(): string[] {
    const today = new Date().toISOString().split('T')[0];
    const key = `fred_used_suggestions_${today}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
