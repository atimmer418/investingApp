import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JwtTokenUtils } from '../utils/jwt-token.utils';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

  constructor(private http: HttpClient) {}

  sendMessage(message: string, generateTitle: boolean = false): Observable<{reply: string, title?: string}> {
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
      generateTitle: generateTitle
    };

    return this.http.post<{reply: string, title?: string}>(this.apiUrl, body, { headers });
  }

  getHistory(): Observable<any[]> {
    const token = JwtTokenUtils.getValidJwtToken();
    const userId = localStorage.getItem('userId');

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<any[]>(`${this.apiUrl}/history?userId=${userId}`, { headers });
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
