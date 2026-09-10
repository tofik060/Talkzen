import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ChatAppService } from '../services/chat-app.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  email = '';
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private chatAppService: ChatAppService,
    private router: Router
  ) {
    if (this.chatAppService.isLoggedIn()) {
      this.router.navigate(['/chat-application']);
    }
  }

  submit() {
    this.errorMessage = '';
    this.successMessage = '';
    const email = this.email.trim();
    if (!email) {
      this.errorMessage = 'Email is required';
      return;
    }

    this.loading = true;
    this.chatAppService.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status === 200 && res?.resetToken) {
          this.router.navigate(['/reset-password'], {
            queryParams: { token: res.resetToken },
          });
          return;
        }
        this.successMessage = res?.message || 'Check your email to continue.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Failed to start password reset';
      },
    });
  }
}
