import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { LoginComponent } from './login/login.component';
import { ChatBodyComponent } from './chat-body/chat-body.component';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { RegistrationComponent } from './registration/registration.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { ProfileDialogComponent } from './profile-dialog/profile-dialog.component';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { environment } from '../environments/environment';

const config: SocketIoConfig = {
  url: environment.socket_URI,
  options: {
    autoConnect: false,
    auth: {
      token:
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('auth_token') || ''
          : '',
    },
  },
};

@NgModule({
  declarations: [
    AppComponent,
    NavBarComponent,
    LoginComponent,
    ChatBodyComponent,
    RegistrationComponent,
    ConfirmDialogComponent,
    ProfileDialogComponent,
    ChangePasswordDialogComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatInputModule,
    MatDialogModule,
    SocketIoModule.forRoot(config),
    MatFormFieldModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
