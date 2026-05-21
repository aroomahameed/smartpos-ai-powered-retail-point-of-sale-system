import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="unauthorized-container">
      <mat-icon class="lock-icon">lock</mat-icon>
      <h1>Access Denied</h1>
      <p>You don't have permission to view this page.</p>
      <button mat-raised-button color="primary" routerLink="/dashboard">
        <mat-icon>home</mat-icon>
        Go to Dashboard
      </button>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
      text-align: center;
    }

    .lock-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #e53935;
    }

    h1 {
      font-size: 2rem;
      color: #333;
      margin: 0;
    }

    p {
      color: #666;
      font-size: 1.1rem;
      margin: 0;
    }
  `]
})
export class UnauthorizedComponent {}