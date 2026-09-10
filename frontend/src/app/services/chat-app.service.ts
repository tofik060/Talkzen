import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatAppService {
  private REST_API = environment.Backend_URL;
  private socket_uri = environment.socket_URI;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  Socket: ClientSocket | null = null;

  constructor(private http: HttpClient, private socket: Socket) {
    this.connectSocket();
  }

  private getSocketAuth() {
    return { token: this.getToken() || '' };
  }

  connectSocket(): void {
    const token = this.getToken();
    if (!token) {
      return;
    }

    if (this.socket.ioSocket) {
      this.socket.ioSocket.auth = this.getSocketAuth();
      if (!this.socket.ioSocket.connected) {
        this.socket.connect();
      } else {
        this.socket.disconnect();
        this.socket.connect();
      }
    }

    if (this.Socket?.connected) {
      this.Socket.disconnect();
    }
    this.Socket = io(this.socket_uri, {
      auth: this.getSocketAuth(),
    });
  }

  setAuth(token: string, userData: any): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    this.connectSocket();
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): any {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.socket.disconnect();
    if (this.Socket?.connected) {
      this.Socket.disconnect();
    }
    this.Socket = null;
  }

  registerData() {
    let api_uri = `${this.REST_API}/user-register`;
    return this.http.get(api_uri);
  }

  getContacts() {
    return this.http.get(`${this.REST_API}/contacts`);
  }

  getChats() {
    return this.http.get(`${this.REST_API}/chats`);
  }

  /** Ping API early so Render free tier can wake before chat lists load */
  wakeApi(): void {
    const base = this.socket_uri || this.REST_API.replace(/\/api\/?$/, '');
    fetch(base + '/', { method: 'GET', mode: 'no-cors' }).catch(() => {});
  }

  sendContactRequest(userId: string) {
    return this.http.post(`${this.REST_API}/contacts/request`, { userId });
  }

  acceptContactRequest(payload: { contactId?: string; userId?: string }) {
    return this.http.post(`${this.REST_API}/contacts/accept`, payload);
  }

  rejectContactRequest(payload: { contactId?: string; userId?: string }) {
    return this.http.post(`${this.REST_API}/contacts/reject`, payload);
  }

  unfollowContact(userId: string) {
    return this.http.post(`${this.REST_API}/contacts/unfollow`, { userId });
  }

  registration(data: FormData) {
    let api_uri = `${this.REST_API}/user-register`;
    return this.http.post(api_uri, data);
  }

  messageGet(id: any) {
    let api_uri = `${this.REST_API}/user-register/${id}`;
    return this.http.get(api_uri);
  }

  login(email: string, password: string) {
    let api_uri = `${this.REST_API}/login`;
    return this.http.post(api_uri, { email, password });
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.REST_API}/forgot-password`, { email });
  }

  resetPassword(payload: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return this.http.post(`${this.REST_API}/reset-password`, payload);
  }

  getMe() {
    return this.http.get(`${this.REST_API}/me`);
  }

  updateProfile(payload: {
    name: string;
    email: string;
    phone: string;
    location: string;
    image?: string;
  }) {
    return this.http.put(`${this.REST_API}/me`, payload);
  }

  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return this.http.post(`${this.REST_API}/change-password`, payload);
  }

  deleteAccount() {
    return this.http.delete(`${this.REST_API}/me`);
  }

  hasAvatar(image?: string | null): boolean {
    return !!image && String(image).trim().length > 0;
  }

  getInitials(name?: string | null): string {
    if (!name?.trim()) {
      return '?';
    }
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getImageUrl(image?: string | null): string {
    if (!this.hasAvatar(image)) {
      return '';
    }
    if (image!.startsWith('assets/') || image!.startsWith('http://') || image!.startsWith('https://')) {
      return image!;
    }
    if (image!.startsWith('/uploads') || image!.startsWith('uploads/')) {
      const path = image!.startsWith('/') ? image! : `/${image}`;
      return `${environment.socket_URI}${path}`;
    }
    return `${environment.socket_URI}/${image}`;
  }

  chatmsgs(userId?: string, peerId?: string) {
    let api_uri = `${this.REST_API}/message`;
    if (userId && peerId) {
      api_uri += `?userId=${encodeURIComponent(userId)}&peerId=${encodeURIComponent(peerId)}`;
    }
    return this.http.get(api_uri);
  }

  chatmsg(payload: {
    senderId: string;
    receiverId: string;
    name: string;
    message: string;
  }) {
    let api_uri = `${this.REST_API}/message`;
    return this.http.post(api_uri, payload);
  }

  markMessagesRead(peerId: string) {
    return this.http.post(`${this.REST_API}/message/read`, { peerId });
  }

  userConnect(data: string | { name: string; user?: string }) {
    const payload =
      typeof data === 'string' ? { name: data } : { name: data.name };
    this.socket.emit('new-user-joined', payload);
  }

  sendMessage(message: any) {
    this.socket.emit('chat-msg', message);
  }

  getMessage(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('receive', (data: any) => {
        observer.next(data);
      });
      return () => {
        this.socket.removeListener('receive');
      };
    });
  }

  getStorage() {
    const storage: any = localStorage.getItem('chats');
    return storage ? JSON.parse(storage) : [];
  }

  setStorage(data: any) {
    localStorage.setItem('chats', JSON.stringify(data));
  }

  disConnect(data: any): Observable<any> {
    return this.socket.emit('leave', data);
  }

  logout(): void {
    this.clearAuth();
  }
}
