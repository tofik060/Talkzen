import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChatAppService } from '../services/chat-app.service';

@Component({
  selector: 'app-profile-dialog',
  templateUrl: './profile-dialog.component.html',
  styleUrls: ['./profile-dialog.component.css'],
})
export class ProfileDialogComponent implements OnInit {
  form!: FormGroup;
  errorMessage = '';
  saving = false;

  avatars = [
    { id: 'iron-man', label: 'Iron Man', path: 'assets/avatars/iron-man.png' },
    { id: 'goku', label: 'Goku', path: 'assets/avatars/goku.png' },
    { id: 'rengoku', label: 'Rengoku', path: 'assets/avatars/rengoku.png' },
    { id: 'luffy', label: 'Luffy', path: 'assets/avatars/luffy.png' },
    { id: 'goku-black', label: 'Goku Black', path: 'assets/avatars/goku-black.png' },
    { id: 'zenitsu', label: 'Zenitsu', path: 'assets/avatars/zenitsu.png' },
  ];

  selectedAvatar = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProfileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public user: any,
    public chatAppService: ChatAppService
  ) {}

  ngOnInit(): void {
    this.selectedAvatar = this.chatAppService.hasAvatar(this.user?.image)
      ? this.user.image
      : '';

    this.form = this.fb.group({
      name: [this.user?.name || '', Validators.required],
      email: [this.user?.email || '', [Validators.required, Validators.email]],
      phone: [
        this.user?.phone || '',
        [Validators.required, Validators.pattern(/^\d{10}$/)],
      ],
      location: [this.user?.location || '', Validators.required],
      image: [this.selectedAvatar],
    });
  }

  selectAvatar(path: string) {
    if (this.selectedAvatar === path) {
      this.selectedAvatar = '';
      this.form.patchValue({ image: '' });
      return;
    }
    this.selectedAvatar = path;
    this.form.patchValue({ image: path });
  }

  clearAvatar() {
    this.selectedAvatar = '';
    this.form.patchValue({ image: '' });
  }

  close(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = {
      name: this.form.value.name.trim(),
      email: this.form.value.email.trim(),
      phone: this.form.value.phone.trim(),
      location: this.form.value.location.trim(),
      image: this.selectedAvatar || '',
    };

    this.chatAppService.updateProfile(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        const updated = res?.userData || { ...this.user, ...payload };
        this.dialogRef.close(updated);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to update profile';
      },
    });
  }
}
