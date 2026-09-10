import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ChatAppService } from '../services/chat-app.service';
import { Socket } from 'ngx-socket-io';
import { Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ProfileDialogComponent } from '../profile-dialog/profile-dialog.component';
import { ChangePasswordDialogComponent } from '../change-password-dialog/change-password-dialog.component';
import { EditMessageDialogComponent } from '../edit-message-dialog/edit-message-dialog.component';

@Component({
  selector: 'app-chat-body',
  templateUrl: './chat-body.component.html',
  styleUrls: ['./chat-body.component.css'],
})
export class ChatBodyComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLElement>;

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
  public accountMenuOpen = false;
  public chatMenuOpen = false;
  public chatSearchOpen = false;
  public chatSearchTerm = '';
  public messageMenuId: string | null = null;
  public messageMenuAbove = false;
  public messageArray: {
    _id?: string;
    name: string;
    message: string;
    time?: string;
    timestamp?: string | Date;
    senderId?: string;
    receiverId?: string;
    edited?: boolean;
  }[] = [];

  listsLoading = false;
  messagesLoading = false;

  private messageSub?: Subscription;
  private messageUpdatedSub?: Subscription;
  private messageDeletedSub?: Subscription;

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

      const incomingId = data?._id ? String(data._id) : '';
      if (
        incomingId &&
        this.messageArray.some((m) => String(m._id || '') === incomingId)
      ) {
        return;
      }

      this.messageArray.push({
        _id: incomingId || undefined,
        name: data.name,
        message: data.message,
        senderId: data.senderId,
        receiverId: data.receiverId,
        time: data.time || this.nowTime(),
        timestamp: data.timestamp || new Date().toISOString(),
        edited: !!data.edited,
      });
      this.scrollToLatestMessage();

      if (sender === this.userId(this.selectedUser) && receiver === me) {
        this.markSelectedRead();
      }
    });

    this.messageUpdatedSub = this.chatAppService
      .onMessageUpdated()
      .subscribe((data: any) => {
        const id = String(data?._id || '');
        if (!id || !this.isForActiveChat(data)) return;
        const idx = this.messageArray.findIndex((m) => String(m._id) === id);
        if (idx < 0) return;
        this.messageArray[idx] = {
          ...this.messageArray[idx],
          message: data.message,
          edited: true,
        };
        this.messageArray = [...this.messageArray];
      });

    this.messageDeletedSub = this.chatAppService
      .onMessageDeleted()
      .subscribe((data: any) => {
        const id = String(data?._id || '');
        if (!id) return;
        if (this.messageMenuId === id) {
          this.messageMenuId = null;
        }
        if (!this.isForActiveChat(data)) return;
        this.messageArray = this.messageArray.filter(
          (m) => String(m._id || '') !== id
        );
      });
  }

  private scrollToLatestMessage() {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
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
    const list = this.displayedMessages;
    const current = list[index];
    if (!current || current.name === 'system') return false;

    const currentKey = this.dayKey(current.timestamp || current.time);
    if (!currentKey) return false;

    if (index === 0) return true;

    for (let i = index - 1; i >= 0; i--) {
      const prev = list[i];
      if (prev?.name === 'system') continue;
      const prevKey = this.dayKey(prev?.timestamp || prev?.time);
      return prevKey !== currentKey;
    }
    return true;
  }

  get displayedMessages() {
    const q = this.chatSearchTerm.trim().toLowerCase();
    if (!q) {
      return this.messageArray;
    }
    return this.messageArray.filter(
      (msg) =>
        msg.name !== 'system' &&
        String(msg.message || '')
          .toLowerCase()
          .includes(q)
    );
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
          this.logout(true);
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
    this.messageMenuId = null;
    this.messagesLoading = true;
    this.join(this.currentUser.name, this.selectedUser.name);
    this.loadConversation();
    this.markSelectedRead();
  }

  loadConversation() {
    const me = this.userId(this.currentUser);
    const peer = this.userId(this.selectedUser);
    if (!me || !peer) {
      this.messagesLoading = false;
      return;
    }

    this.messagesLoading = true;
    this.chatAppService.chatmsgs(me, peer).subscribe({
      next: (res: any) => {
        const rows = res?.Data || [];
        this.messageArray = rows.map((row: any) => ({
          _id: String(row._id),
          name: row.name,
          message: row.message,
          senderId: String(row.senderId),
          receiverId: String(row.receiverId),
          time: this.nowTime(row.timestamp),
          timestamp: row.timestamp,
          edited: !!row.edited,
        }));
        this.messagesLoading = false;
        this.scrollToLatestMessage();
      },
      error: () => {
        this.messagesLoading = false;
        this.messageArray = [];
      },
    });
  }

  leaveChat() {
    this.selectedUser = null;
    this.messageArray = [];
    this.messagesLoading = false;
    this.chatMenuOpen = false;
    this.chatSearchOpen = false;
    this.chatSearchTerm = '';
    this.messageMenuId = null;
    this.messageMenuAbove = false;
  }

  onMessageBubbleClick(event: Event, msg: any) {
    event.stopPropagation();
    if (msg?.name !== this.currentUser?.name || !msg?._id) {
      return;
    }
    this.settingsOpen = false;
    this.accountMenuOpen = false;
    this.chatMenuOpen = false;
    const opening = this.messageMenuId !== msg._id;
    this.messageMenuId = opening ? msg._id : null;
    this.messageMenuAbove = false;

    if (!opening) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    const wrap = target?.closest?.('.bubble-wrap') as HTMLElement | null;
    const scroller = this.messagesContainer?.nativeElement;
    if (wrap && scroller) {
      const wrapRect = wrap.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const spaceBelow = scrollerRect.bottom - wrapRect.bottom;
      this.messageMenuAbove = spaceBelow < 140;
    }

    setTimeout(() => {
      wrap?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
    }, 0);
  }

  editMessage(msg: any) {
    this.messageMenuId = null;
    if (!msg?._id) return;

    const dialogRef = this.dialog.open(EditMessageDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
      autoFocus: 'dialog',
      data: { _id: msg._id, message: msg.message },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      const idx = this.messageArray.findIndex(
        (m) => String(m._id) === String(result._id)
      );
      if (idx < 0) return;
      this.messageArray[idx] = {
        ...this.messageArray[idx],
        message: result.message,
        edited: true,
      };
      this.messageArray = [...this.messageArray];
    });
  }

  deleteMessagePermanently(msg: any) {
    this.messageMenuId = null;
    if (!msg?._id) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
      autoFocus: 'dialog',
      data: {
        title: 'Delete message',
        message:
          'Permanently delete this message for everyone? This cannot be undone.',
        confirmText: 'Delete permanently',
        cancelText: 'Cancel',
        icon: 'delete_forever',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.chatAppService.deleteMessage(msg._id).subscribe({
        next: () => {
          this.messageArray = this.messageArray.filter(
            (m) => String(m._id || '') !== String(msg._id)
          );
        },
        error: (err) => {
          this.actionError =
            err?.error?.message || 'Failed to delete message';
        },
      });
    });
  }

  toggleChatMenu(event: Event) {
    event.stopPropagation();
    this.chatMenuOpen = !this.chatMenuOpen;
    if (this.chatMenuOpen) {
      this.settingsOpen = false;
      this.accountMenuOpen = false;
      this.messageMenuId = null;
    }
  }

  openChatSearch() {
    this.chatMenuOpen = false;
    this.chatSearchOpen = true;
  }

  closeChatSearch() {
    this.chatSearchOpen = false;
    this.chatSearchTerm = '';
  }

  closeChatFromMenu() {
    this.chatMenuOpen = false;
    this.leaveChat();
  }

  clearChat() {
    this.chatMenuOpen = false;
    if (!this.selectedUser) return;

    const peerName = this.selectedUser.name;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
      autoFocus: 'dialog',
      data: {
        title: 'Clear chat',
        message: `Clear this chat for you only? ${peerName} will still keep the full message history.`,
        confirmText: 'Clear for me',
        cancelText: 'Cancel',
        icon: 'delete_sweep',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      const peer = this.userId(this.selectedUser);
      this.chatAppService.clearChat(peer).subscribe({
        next: () => {
          this.messageArray = [];
          const chat = this.chatUsers.find((u) => this.userId(u) === peer);
          if (chat) {
            chat.lastMessage = '';
            chat.lastMessageTime = null;
            chat.unreadCount = 0;
            this.chatUsers = [...this.chatUsers];
            if (this.activeTab === 'chats') {
              this.applySearch();
            }
          }
        },
        error: (err) => {
          this.actionError = err?.error?.message || 'Failed to clear chat';
        },
      });
    });
  }

  deleteChat() {
    this.chatMenuOpen = false;
    if (!this.selectedUser) return;

    const target = this.selectedUser;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
      autoFocus: 'dialog',
      data: {
        title: 'Delete chat',
        message: `Remove ${target.name} from your chats? Message history is kept for them, but they leave your chat list.`,
        confirmText: 'Delete chat',
        cancelText: 'Cancel',
        icon: 'delete_forever',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.actionError = '';
      this.chatAppService.unfollowContact(this.userId(target)).subscribe({
        next: () => {
          this.leaveChat();
          this.refreshLists(false);
        },
        error: (err) => {
          this.actionError = err?.error?.message || 'Failed to delete chat';
        },
      });
    });
  }

  join(user: string, name: string) {
    this.chatAppService.userConnect({ user, name });
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
      next: (res: any) => {
        const saved = res?.data;
        const msg = {
          ...payload,
          _id: saved?._id ? String(saved._id) : undefined,
          timestamp: saved?.timestamp || payload.timestamp,
          edited: false,
        };
        this.chatAppService.sendMessage(msg);
        this.messageArray.push(msg);
        this.messageText = '';
        this.scrollToLatestMessage();

        const chat = this.chatUsers.find(
          (u) => this.userId(u) === this.userId(this.selectedUser)
        );
        if (chat) {
          chat.lastMessage = msg.message;
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

  logout(skipConfirm = false) {
    this.settingsOpen = false;
    this.accountMenuOpen = false;

    if (skipConfirm) {
      this.chatAppService.logout();
      this.router.navigate(['/']);
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
      autoFocus: 'dialog',
      data: {
        title: 'Log out',
        message: 'Are you sure you want to log out of Talkzen?',
        confirmText: 'Log out',
        cancelText: 'Cancel',
        icon: 'logout',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.chatAppService.logout();
      this.router.navigate(['/']);
    });
  }

  toggleSettings() {
    if (this.accountMenuOpen) {
      this.accountMenuOpen = false;
      return;
    }
    this.settingsOpen = !this.settingsOpen;
  }

  openAccountMenu(event: Event) {
    event.stopPropagation();
    this.settingsOpen = false;
    this.accountMenuOpen = true;
  }

  backToSettings(event: Event) {
    event.stopPropagation();
    this.accountMenuOpen = false;
    this.settingsOpen = true;
  }

  @HostListener('document:click')
  closeSettingsOnOutsideClick() {
    this.settingsOpen = false;
    this.accountMenuOpen = false;
    this.chatMenuOpen = false;
    this.messageMenuId = null;
    this.messageMenuAbove = false;
  }

  openProfile() {
    this.settingsOpen = false;
    this.accountMenuOpen = false;
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
    this.accountMenuOpen = false;
    this.dialog.open(ChangePasswordDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
    });
  }

  deleteAccount() {
    this.settingsOpen = false;
    this.accountMenuOpen = false;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'talkzen-confirm-panel',
      backdropClass: 'talkzen-confirm-backdrop',
      autoFocus: 'dialog',
      data: {
        title: 'Delete account',
        message:
          'This permanently deletes your account, chats, and contacts. This cannot be undone.',
        confirmText: 'Delete account',
        cancelText: 'Keep account',
        icon: 'person_off',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.chatAppService.deleteAccount().subscribe({
        next: () => {
          this.chatAppService.logout();
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.actionError =
            err?.error?.message || 'Failed to delete account';
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.messageSub?.unsubscribe();
    this.messageUpdatedSub?.unsubscribe();
    this.messageDeletedSub?.unsubscribe();
  }
}
