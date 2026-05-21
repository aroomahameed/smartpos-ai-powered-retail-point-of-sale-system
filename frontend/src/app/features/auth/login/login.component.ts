import { Component, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card">

        <!-- Header -->
        <div class="login-header">
          <mat-icon class="pos-icon">point_of_sale</mat-icon>
          <h1>POS System</h1>
          <p>Sign in to your account</p>
        </div>

        <!-- Form -->
        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">

            <!-- Email -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input
                matInput
                type="email"
                formControlName="email"
                placeholder="admin@pos.com"/>
              <mat-icon matSuffix>email</mat-icon>
              @if (loginForm.get('email')?.hasError('required') &&
                   loginForm.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (loginForm.get('email')?.hasError('email') &&
                   loginForm.get('email')?.touched) {
                <mat-error>Enter a valid email</mat-error>
              }
            </mat-form-field>

            <!-- Password -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"/>
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="togglePassword()">
                <mat-icon>
                  {{ showPassword() ? 'visibility_off' : 'visibility' }}
                </mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') &&
                   loginForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            <!-- Error Message -->
            @if (errorMessage()) {
              <div class="error-alert">
                <mat-icon>error</mat-icon>
                {{ errorMessage() }}
              </div>
            }

            <!-- Submit -->
            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width login-btn"
              [disabled]="isLoading() || loginForm.invalid">
              @if (isLoading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Login
              }
            </button>

          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #3949ab 100%);
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 24px;
      border-radius: 16px !important;
    }

    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .pos-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #1a237e;
    }

    .login-header h1 {
      font-size: 1.8rem;
      font-weight: 700;
      color: #1a237e;
      margin: 8px 0 4px;
    }

    .login-header p {
      color: #666;
      margin: 0;
    }

    .full-width { width: 100%; }

    .login-btn {
      height: 48px;
      font-size: 1rem;
      margin-top: 8px;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.9rem;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // 🔷 Signals
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  showPassword = signal<boolean>(false);

  // 🔷 Form
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || '❌ Login failed. Please try again.'
        );
      },
    });
  }
}