import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ChatAppService } from '../services/chat-app.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css'],
})
export class NavBarComponent implements OnInit, OnDestroy {
  menuType: string = 'default';
  showTopNav = true;
  private sub?: Subscription;

  constructor(
    private router: Router,
    private chatAppService: ChatAppService
  ) {}

  ngOnInit(): void {
    this.updateNavVisibility(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateNavVisibility(e.urlAfterRedirects));
  }

  private updateNavVisibility(url: string) {
    this.showTopNav = !url.includes('/chat-application');
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
