import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChatAppService } from '../services/chat-app.service';

@Component({
  selector: 'app-edit-message-dialog',
  templateUrl: './edit-message-dialog.component.html',
  styleUrls: ['./edit-message-dialog.component.css'],
})
export class EditMessageDialogComponent {
  form: FormGroup;
  errorMessage = '';
  saving = false;

  constructor(
    private fb: FormBuilder,
    private chatAppService: ChatAppService,
    private dialogRef: MatDialogRef<EditMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { _id: string; message: string }
  ) {
    this.form = this.fb.group({
      message: [data?.message || '', [Validators.required, Validators.maxLength(2000)]],
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const text = String(this.form.value.message || '').trim();
    if (!text) {
      this.errorMessage = 'Message cannot be empty';
      return;
    }

    this.saving = true;
    this.chatAppService.updateMessage(this.data._id, text).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.dialogRef.close({
          _id: this.data._id,
          message: text,
          edited: true,
          data: res?.data,
        });
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to update message';
      },
    });
  }
}
