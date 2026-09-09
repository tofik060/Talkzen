import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ChatAppService } from '../services/chat-app.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private chatAppService: ChatAppService,
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const token = this.chatAppService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const isMeEndpoint = request.url.includes('/api/me');
        if (
          error.status === 401 ||
          (error.status === 404 && isMeEndpoint)
        ) {
          this.chatAppService.clearAuth();
          this.router.navigate(['/']);
        }
        return throwError(() => error);
      })
    );
  }
}
