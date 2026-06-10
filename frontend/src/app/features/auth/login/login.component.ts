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
      <section class="login-stage">
        <aside class="brand-panel">
          <div class="brand-mark">
            <mat-icon>point_of_sale</mat-icon>
            <span>RetailOS</span>
          </div>

          <div class="brand-copy">
            <p class="eyebrow">Smart POS command center</p>
            <h1>Run sales, stock, customers, and reports from one polished workspace.</h1>
          </div>

          <div class="signal-grid">
            <div>
              <strong>Live</strong>
              <span>Sales insights</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Inventory control</span>
            </div>
            <div>
              <strong>Fast</strong>
              <span>Checkout flow</span>
            </div>
          </div>
        </aside>

        <mat-card class="login-card">
          <div class="login-header">
            <div class="icon-tile">
              <mat-icon>lock_open</mat-icon>
            </div>
            <div>
              <p class="eyebrow">Welcome back</p>
              <h2>Sign in to POS System</h2>
              <span>Use your staff account to continue.</span>
            </div>
          </div>

          <mat-card-content>
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input
                  matInput
                  type="email"
                  formControlName="email"
                  placeholder="admin@pos.com"/>
                <mat-icon matSuffix>alternate_email</mat-icon>
                @if (loginForm.get('email')?.hasError('required') &&
                     loginForm.get('email')?.touched) {
                  <mat-error>Email is required</mat-error>
                }
                @if (loginForm.get('email')?.hasError('email') &&
                     loginForm.get('email')?.touched) {
                  <mat-error>Enter a valid email</mat-error>
                }
              </mat-form-field>

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

              @if (errorMessage()) {
                <div class="error-alert">
                  <mat-icon>error</mat-icon>
                  {{ errorMessage() }}
                </div>
              }

              <button
                mat-flat-button
                color="primary"
                type="submit"
                class="full-width login-btn"
                [disabled]="isLoading() || loginForm.invalid">
                @if (isLoading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <span>Login</span>
                  <mat-icon>arrow_forward</mat-icon>
                }
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      </section>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      width: 100%;
      display: grid;
      place-items: center;
      padding: 28px;
      background:
        linear-gradient(90deg, rgba(16,24,39,0.04) 1px, transparent 1px),
        linear-gradient(rgba(16,24,39,0.04) 1px, transparent 1px),
        linear-gradient(135deg, #eef7f3 0%, #f7f4ed 45%, #eef3fb 100%);
      background-size: 42px 42px, 42px 42px, auto;
    }

    .login-stage {
      width: min(1040px, 100%);
      min-height: 620px;
      display: grid;
      grid-template-columns: minmax(360px, 1fr) minmax(360px, 430px);
      overflow: hidden;
      border: 1px solid rgba(16, 24, 39, 0.08);
      border-radius: 22px;
      background: rgba(255,255,255,0.72);
      box-shadow: var(--app-shadow);
      backdrop-filter: blur(14px);
    }

    .brand-panel {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 32px;
      min-height: 100%;
      padding: 36px;
      color: white;
      background:
        linear-gradient(135deg, rgba(15,143,120,0.92), rgba(16,24,39,0.96) 58%),
        repeating-linear-gradient(135deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 18px);
    }

    .brand-mark {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      width: fit-content;
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 12px;
      background: rgba(255,255,255,0.1);
      font-weight: 900;
    }

    .brand-mark mat-icon {
      color: #f1b44c;
    }

    .brand-copy {
      max-width: 520px;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #0f8f78;
      font-size: 0.78rem;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .brand-copy .eyebrow {
      color: #f1c16b;
    }

    .brand-copy h1 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 3.35rem);
      line-height: 1.03;
      font-weight: 900;
    }

    .signal-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .signal-grid div {
      display: grid;
      gap: 4px;
      padding: 14px;
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 12px;
      background: rgba(255,255,255,0.09);
    }

    .signal-grid strong {
      font-size: 1.1rem;
      font-weight: 900;
      color: #f6c56f;
    }

    .signal-grid span {
      color: rgba(255,255,255,0.75);
      font-size: 0.78rem;
      font-weight: 800;
    }

    .login-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      padding: 38px 34px;
      border: 0;
      border-radius: 0 !important;
      background: rgba(255,255,255,0.96);
      box-shadow: none !important;
    }

    .login-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 28px;
    }

    .icon-tile {
      display: grid;
      place-items: center;
      flex: 0 0 52px;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #e8f6f2;
      color: #0f8f78;
    }

    .login-header h2 {
      color: #101827;
      font-size: 1.55rem;
      font-weight: 900;
      margin: 0;
    }

    .login-header span {
      display: block;
      margin-top: 3px;
      color: #657489;
      font-size: 0.92rem;
      font-weight: 700;
    }

    .full-width { width: 100%; }

    mat-form-field {
      margin-bottom: 4px;
    }

    .login-btn {
      height: 50px;
      margin-top: 10px;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 900;
    }

    .login-btn ::ng-deep .mdc-button__label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border: 1px solid #ffd3d8;
      border-radius: 10px;
      margin-bottom: 16px;
      font-size: 0.9rem;
      font-weight: 800;
    }

    @media (max-width: 860px) {
      .login-stage {
        grid-template-columns: 1fr;
      }

      .brand-panel {
        min-height: 330px;
      }

      .login-card {
        border-radius: 0 !important;
      }
    }

    @media (max-width: 560px) {
      .login-wrapper {
        padding: 12px;
      }

      .brand-panel,
      .login-card {
        padding: 24px;
      }

      .signal-grid {
        grid-template-columns: 1fr;
      }
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
