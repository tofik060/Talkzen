import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ChatAppService } from '../services/chat-app.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(
    private chatAppService: ChatAppService,
    private router: Router
  ) {
    if (this.chatAppService.isLoggedIn()) {
      this.router.navigate(['/chat-application']);
    }
  }

  login() {
    this.errorMessage = '';
    this.chatAppService.login(this.email, this.password).subscribe({
      next: (res: any) => {
        if (res.status === 200 && res.token) {
          this.chatAppService.setAuth(res.token, res.userData);
          this.chatAppService.userConnect(res.userData.name);
          this.router.navigate(['/chat-application']);
        } else {
          this.errorMessage = res.message || 'Login failed';
        }
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || 'Invalid email or password';
      },
    });
  }
}
