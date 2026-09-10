import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ChatAppService } from '../services/chat-app.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private chatAppService: ChatAppService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    if (!this.chatAppService.isLoggedIn()) {
      return of(this.router.createUrlTree(['/']));
    }

    return this.chatAppService.getMe().pipe(
      map((res: any) => {
        if (res?.status === 200 && res?.userData) {
          const token = this.chatAppService.getToken();
          if (token) {
            this.chatAppService.setAuth(token, res.userData);
          }
          return true;
        }
        this.chatAppService.clearAuth();
        return this.router.createUrlTree(['/']);
      }),
      catchError((err) => {
        // Network / cold-start: keep local session so chat can still open
        if (err?.status === 0 && this.chatAppService.getCurrentUser()?.name) {
          return of(true);
        }
        this.chatAppService.clearAuth();
        return of(this.router.createUrlTree(['/']));
      })
    );
  }
}
