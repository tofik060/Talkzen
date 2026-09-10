import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ChatAppService } from '../services/chat-app.service';
import { Socket } from 'ngx-socket-io';
import { Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ProfileDialogComponent } from '../profile-dialog/profile-dialog.component';
import { ChangePasswordDialogComponent } from '../change-password-dialog/change-password-dialog.component';

@Component({
  selector: 'app-chat-body',
  templateUrl: './chat-body.component.html',
  styleUrls: ['./chat-body.component.css'],
})
export class ChatBodyComponent implements OnInit, OnDestroy {
  activeTab: 'chats' | 'contacts' = 'chats';

  chatUsers: any[] = [];
  contactUsers: any[] = [];
  filteredUsers: any[] = [];
  searchTerm = '';

  public userName = '';
  public selectedUser: any;
  public currentUser: any;
  public showScreen = false;
  public actionError = '';

  public messageText = '';
  public settingsOpen = false;
  public messageArray: {
    name: string;
    message: string;
    time?: string;
    timestamp?: string | Date;
    senderId?: string;
    receiverId?: string;
  }[] = [];

  listsLoading = false;

  private messageSub?: Subscription;

  constructor(
    public chatAppService: ChatAppService,
    private socket: Socket,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const savedUser = this.chatAppService.getCurrentUser();
    if (!savedUser?.name) {
      this.router.navigate(['/']);
      return;
    }

    this.userName = savedUser.name;
    this.currentUser = savedUser;
    this.showScreen = true;
    this.chatAppService.userConnect(this.userName);
    this.chatAppService.wakeApi();
    this.refreshLists();

    this.messageSub = this.chatAppService.getMessage().subscribe((data: any) => {
      const me = this.userId(this.currentUser);
      const sender = String(data?.senderId || '');
      const receiver = String(data?.receiverId || '');

      if (receiver === me && sender && !this.isForActiveChat(data)) {
        this.bumpUnread(sender, data);
      }

      if (!this.isForActiveChat(data)) {
        return;
      }

      this.messageArray.push({
        name: data.name,
        message: data.message,
        senderId: data.senderId,
        receiverId: data.receiverId,
        time: data.time || this.nowTime(),
        timestamp: data.timestamp || new Date().toISOString(),
      });

      if (sender === this.userId(this.selectedUser) && receiver === me) {
        this.markSelectedRead();
      }
    });
  }

  private userId(user: any): string {
    return String(user?._id || user?.id || '');
  }

  userIdMatch(user: any): boolean {
    return this.userId(user) === this.userId(this.selectedUser);
  }

  private isForActiveChat(data: any): boolean {
    if (!this.currentUser || !this.selectedUser) return false;
    const me = this.userId(this.currentUser);
    const peer = this.userId(this.selectedUser);
    const sender = String(data?.senderId || '');
    const receiver = String(data?.receiverId || '');
    if (!sender || !receiver) return false;
    return (
      (sender === me && receiver === peer) ||
      (sender === peer && receiver === me)
    );
  }

  nowTime(date?: string | Date): string {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private dayKey(value?: string | Date | null): string {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  dateLabel(value?: string | Date | null): string {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round(
      (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  showDateSeparator(index: number): boolean {
    const current = this.messageArray[index];
    if (!current || current.name === 'system') return false;

    const currentKey = this.dayKey(current.timestamp || current.time);
    if (!currentKey) return false;

    if (index === 0) return true;

    for (let i = index - 1; i >= 0; i--) {
      const prev = this.messageArray[i];
      if (prev?.name === 'system') continue;
      const prevKey = this.dayKey(prev?.timestamp || prev?.time);
      return prevKey !== currentKey;
    }
    return true;
  }

  refreshLists(keepSelection = true) {
    const selectedId = keepSelection ? this.userId(this.selectedUser) : '';
    this.listsLoading = true;
    this.actionError = '';

    forkJoin({
      chats: this.chatAppService.getChats(),
      contacts: this.chatAppService.getContacts(),
    }).subscribe({
      next: (res: any) => {
        this.listsLoading = false;
        this.showScreen = true;

        this.chatUsers = res?.chats?.chats || [];
        this.contactUsers = res?.contacts?.contacts || [];
        this.applySearch();

        if (selectedId) {
          const stillInChats = this.chatUsers.find(
            (u) => this.userId(u) === selectedId
          );
          if (stillInChats) {
            this.selectedUser = stillInChats;
          } else if (this.selectedUser) {
            this.leaveChat();
          }
        }
      },
      error: (err) => {
        this.listsLoading = false;
        this.actionError =
          err?.status === 0
            ? 'Connecting to server… try again in a moment.'
            : err?.error?.message || 'Failed to load chats';
        if (err?.status === 401) {
          this.logout();
        }
      },
    });
  }

  setTab(tab: 'chats' | 'contacts') {
    this.activeTab = tab;
    this.searchTerm = '';
    this.actionError = '';
    this.applySearch();
    if (tab === 'contacts') {
      this.leaveChat();
    }
  }

  applySearch() {
    const q = this.searchTerm.trim().toLowerCase();
    const source =
      this.activeTab === 'chats' ? this.chatUsers : this.contactUsers;
    this.filteredUsers = !q
      ? [...source]
      : source.filter((u) => u?.name?.toLowerCase().includes(q));
  }

  get chatsBadgeCount(): number {
    return this.chatUsers.reduce(
      (sum, user) => sum + (Number(user?.unreadCount) || 0),
      0
    );
  }

  get contactsBadgeCount(): number {
    return this.contactUsers.filter(
      (user) =>
        user?.contactStatus === 'pending' &&
        user?.contactDirection === 'incoming'
    ).length;
  }

  badgeLabel(count: number): string {
    return count > 99 ? '99+' : String(count);
  }

  formatChatTime(value?: string | Date | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  private bumpUnread(senderId: string, data: any) {
    const chat = this.chatUsers.find((u) => this.userId(u) === senderId);
    if (!chat) return;
    chat.unreadCount = (Number(chat.unreadCount) || 0) + 1;
    chat.lastMessage = data?.message || chat.lastMessage;
    chat.lastMessageTime = new Date().toISOString();
    chat.lastMessageMine = false;
    this.chatUsers = [...this.chatUsers].sort((a, b) => {
      const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return tb - ta;
    });
    if (this.activeTab === 'chats') {
      this.applySearch();
    }
  }

  private markSelectedRead() {
    const peer = this.userId(this.selectedUser);
    if (!peer) return;

    const chat = this.chatUsers.find((u) => this.userId(u) === peer);
    if (chat) {
      chat.unreadCount = 0;
    }

    this.chatAppService.markMessagesRead(peer).subscribe({
      error: (err) => console.error('Failed to mark messages read', err),
    });
  }

  selectedUserHandler(user: any) {
    if (this.activeTab !== 'chats') {
      return;
    }
    this.selectedUser = user;
    this.messageArray = [];
    this.join(this.currentUser.name, this.selectedUser.name);
    this.loadConversation();
    this.markSelectedRead();
  }

  loadConversation() {
    const me = this.userId(this.currentUser);
    const peer = this.userId(this.selectedUser);
    if (!me || !peer) return;

    this.chatAppService.chatmsgs(me, peer).subscribe((res: any) => {
      const rows = res?.Data || [];
      this.messageArray = rows.map((row: any) => ({
        name: row.name,
        message: row.message,
        senderId: String(row.senderId),
        receiverId: String(row.receiverId),
        time: this.nowTime(row.timestamp),
        timestamp: row.timestamp,
      }));
    });
  }

  join(user: string, name: string) {
    this.chatAppService.userConnect({ user, name });
  }

  leaveChat() {
    this.selectedUser = null;
    this.messageArray = [];
  }

  sendRequest(user: any, event: Event) {
    event.stopPropagation();
    this.actionError = '';
    this.chatAppService.sendContactRequest(this.userId(user)).subscribe({
      next: () => this.refreshLists(),
      error: (err) => {
        this.actionError = err?.error?.message || 'Failed to send request';
      },
    });
  }

  acceptRequest(user: any, event: Event) {
    event.stopPropagation();
    this.actionError = '';
    this.chatAppService
      .acceptContactRequest({
        contactId: user.contactId,
        userId: this.userId(user),
      })
      .subscribe({
        next: () => {
          this.refreshLists();
          this.activeTab = 'chats';
          this.applySearch();
        },
        error: (err) => {
          this.actionError = err?.error?.message || 'Failed to accept request';
        },
      });
  }

  rejectRequest(user: any, event: Event) {
    event.stopPropagation();
    this.actionError = '';
    this.chatAppService
      .rejectContactRequest({
        contactId: user.contactId,
        userId: this.userId(user),
      })
      .subscribe({
        next: () => this.refreshLists(),
        error: (err) => {
          this.actionError = err?.error?.message || 'Failed to reject request';
        },
      });
  }

  unfollow(user?: any, event?: Event) {
    event?.stopPropagation();
    const target = user || this.selectedUser;
    if (!target) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
      autoFocus: 'dialog',
      data: {
        title: 'Unfollow contact',
        message: `Unfollow ${target.name}? They will leave your chats. They can still see history, but can't message you.`,
        confirmText: 'Unfollow',
        cancelText: 'Keep chatting',
        icon: 'person_remove',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.actionError = '';
      this.chatAppService.unfollowContact(this.userId(target)).subscribe({
        next: () => {
          if (this.userId(this.selectedUser) === this.userId(target)) {
            this.leaveChat();
          }
          this.refreshLists(false);
        },
        error: (err) => {
          this.actionError = err?.error?.message || 'Failed to unfollow';
        },
      });
    });
  }

  contactActionLabel(user: any): string {
    if (user?.contactStatus === 'accepted') return 'In chats';
    if (user?.contactStatus === 'pending' && user?.contactDirection === 'outgoing') {
      return 'Request sent';
    }
    if (user?.contactStatus === 'pending' && user?.contactDirection === 'incoming') {
      return 'Wants to connect';
    }
    if (user?.contactStatus === 'unfollowed_by_peer') {
      return 'They unfollowed you';
    }
    if (user?.contactStatus === 'unfollowed') return 'Unfollowed';
    return 'Not connected';
  }

  chatSend() {
    const text = (this.messageText || '').trim();
    if (!text || !this.currentUser || !this.selectedUser) return;
    if (this.selectedUser?.canMessage === false) {
      this.actionError = `You can't message ${this.selectedUser.name} because they unfollowed you.`;
      return;
    }

    const payload = {
      senderId: this.userId(this.currentUser),
      receiverId: this.userId(this.selectedUser),
      name: this.currentUser.name,
      message: text,
      time: this.nowTime(),
      timestamp: new Date().toISOString(),
    };

    this.chatAppService.chatmsg(payload).subscribe({
      next: () => {
        this.chatAppService.sendMessage(payload);
        this.messageArray.push(payload);
        this.messageText = '';

        const chat = this.chatUsers.find(
          (u) => this.userId(u) === this.userId(this.selectedUser)
        );
        if (chat) {
          chat.lastMessage = payload.message;
          chat.lastMessageTime = new Date().toISOString();
          chat.lastMessageMine = true;
          this.chatUsers = [...this.chatUsers];
          if (this.activeTab === 'chats') {
            this.applySearch();
          }
        }
      },
      error: (err) => {
        console.error('Failed to save message', err);
        this.actionError = err?.error?.message || 'Failed to send message';
      },
    });
  }

  logout() {
    this.settingsOpen = false;
    this.chatAppService.logout();
    this.router.navigate(['/']);
  }

  toggleSettings() {
    this.settingsOpen = !this.settingsOpen;
  }

  @HostListener('document:click')
  closeSettingsOnOutsideClick() {
    if (this.settingsOpen) {
      this.settingsOpen = false;
    }
  }

  openProfile() {
    this.settingsOpen = false;
    const dialogRef = this.dialog.open(ProfileDialogComponent, {
      width: '440px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
      data: this.currentUser,
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (!updated) return;
      this.currentUser = updated;
      this.userName = updated.name;
      localStorage.setItem('auth_user', JSON.stringify(updated));
      this.chatAppService.userConnect(updated.name);
      this.refreshLists();
    });
  }

  openChangePassword() {
    this.settingsOpen = false;
    this.dialog.open(ChangePasswordDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
    });
  }

  ngOnDestroy(): void {
    this.messageSub?.unsubscribe();
  }
}
