import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChatAppService } from '../services/chat-app.service';

@Component({
  selector: 'app-change-password-dialog',
  templateUrl: './change-password-dialog.component.html',
  styleUrls: ['./change-password-dialog.component.css'],
})
export class ChangePasswordDialogComponent {
  form: FormGroup;
  errorMessage = '';
  successMessage = '';
  saving = false;

  constructor(
    private fb: FormBuilder,
    private chatAppService: ChatAppService,
    private dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group(
      {
        currentPassword: ['', Validators.required],
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
      { validators: [this.passwordsMatchValidator, this.samePasswordValidator] }
    );
  }

  private passwordsMatchValidator(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private samePasswordValidator(group: FormGroup) {
    const currentPassword = group.get('currentPassword')?.value;
    const newPassword = group.get('newPassword')?.value;
    if (!currentPassword || !newPassword) return null;
    return currentPassword === newPassword ? { samePassword: true } : null;
  }

  close(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.chatAppService
      .changePassword({
        currentPassword: this.form.value.currentPassword,
        newPassword: this.form.value.newPassword,
        confirmPassword: this.form.value.confirmPassword,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = 'Password updated successfully';
          setTimeout(() => this.dialogRef.close(true), 700);
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage =
            err?.error?.message || 'Failed to change password';
        },
      });
  }
}
