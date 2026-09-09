import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatAppService } from '../services/chat-app.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css'],
})
export class RegistrationComponent implements OnInit {
  registerUser!: FormGroup;
  errorMessage: string = '';

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
    public chatAppService: ChatAppService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerUser = this.fb.group(
      {
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: [
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
        phone: ['', Validators.required],
        image: [''],
        location: ['', Validators.required],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  private passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  selectAvatar(path: string) {
    if (this.selectedAvatar === path) {
      this.selectedAvatar = '';
      this.registerUser.patchValue({ image: '' });
      return;
    }
    this.selectedAvatar = path;
    this.registerUser.patchValue({ image: path });
  }

  clearAvatar() {
    this.selectedAvatar = '';
    this.registerUser.patchValue({ image: '' });
  }

  onSubmit() {
    this.errorMessage = '';
    if (this.registerUser.valid) {
      const formData = new FormData();
      formData.append('name', this.registerUser.get('name')?.value);
      formData.append('email', this.registerUser.get('email')?.value);
      formData.append('password', this.registerUser.get('password')?.value);
      formData.append(
        'confirmPassword',
        this.registerUser.get('confirmPassword')?.value
      );
      formData.append('phone', this.registerUser.get('phone')?.value);
      formData.append('location', this.registerUser.get('location')?.value);
      formData.append('image', this.selectedAvatar || '');
      this.chatAppService.registration(formData).subscribe({
        next: (res: any) => {
          console.log('User register', res);
          if (res?.status === 200) {
            this.router.navigate(['/']);
          } else {
            this.errorMessage = res?.message || 'Registration failed';
          }
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Registration failed';
        },
      });
    }
  }

  reset() {
    if (this.registerUser.value) {
      if (window.confirm('Do you want to cancel your registration!')) {
        this.registerUser.reset({ image: '' });
        this.selectedAvatar = '';
        this.errorMessage = '';
      }
    }
  }
}
