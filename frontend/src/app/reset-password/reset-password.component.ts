import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatAppService } from '../services/chat-app.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup;
  token = '';
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private chatAppService: ChatAppService
  ) {
    if (this.chatAppService.isLoggedIn()) {
      this.router.navigate(['/chat-application']);
    }
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Reset link is missing or invalid.';
    }

    this.form = this.fb.group(
      {
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/
            ),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  private passwordsMatchValidator(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  submit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage = 'Reset link is missing or invalid.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.chatAppService
      .resetPassword({
        token: this.token,
        newPassword: this.form.value.newPassword,
        confirmPassword: this.form.value.confirmPassword,
      })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.successMessage =
            res?.message || 'Password reset successfully. You can sign in now.';
          setTimeout(() => this.router.navigate(['/']), 900);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage =
            err?.error?.message || 'Failed to reset password';
        },
      });
  }
}
