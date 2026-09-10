import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { ChatAppService } from '../services/chat-app.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css'],
})
export class NavBarComponent implements OnInit, OnDestroy {
  menuType: string = 'default';
  showTopNav = false;
  private sub?: Subscription;

  constructor(
    private router: Router,
    private chatAppService: ChatAppService
  ) {
    this.syncNavVisibility();
  }

  ngOnInit(): void {
    this.syncNavVisibility();
    this.sub = this.router.events
      .pipe(
        filter(
          (e) =>
            e instanceof NavigationStart ||
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError
        )
      )
      .subscribe((e) => {
        if (e instanceof NavigationStart) {
          if (this.isChatPath(e.url)) {
            this.showTopNav = false;
          }
          return;
        }
        this.syncNavVisibility();
      });
  }

  private syncNavVisibility() {
    const routerUrl = this.router.url || '';
    const hash =
      typeof window !== 'undefined'
        ? window.location.hash.replace(/^#/, '')
        : '';
    this.showTopNav = !this.isChatPath(routerUrl) && !this.isChatPath(hash);
  }

  private isChatPath(path: string): boolean {
    return (path || '').toLowerCase().includes('chat-application');
  }

  isLoggedIn(): boolean {
    return this.chatAppService.isLoggedIn();
  }

  logout(): void {
    this.chatAppService.logout();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
