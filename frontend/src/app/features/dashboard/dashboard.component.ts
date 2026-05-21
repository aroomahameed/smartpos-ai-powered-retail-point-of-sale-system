import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ReportService, DashboardStats } from '../../core/services/report.service';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink,
    BaseChartDirective,
  ],
  template: `
    <div class="dashboard">

      <!-- Stats Cards -->
      @if (isLoading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {
        <div class="stats-grid">

          <!-- Today Sales -->
          <mat-card class="stat-card today">
            <mat-card-content>
              <div class="stat-info">
                <p>Today's Sales</p>
                <h2>{{ stats()?.today?.total | currency }}</h2>
                <span>{{ stats()?.today?.count }} transactions</span>
              </div>
              <mat-icon>today</mat-icon>
            </mat-card-content>
          </mat-card>

          <!-- Monthly Sales -->
          <mat-card class="stat-card monthly">
            <mat-card-content>
              <div class="stat-info">
                <p>Monthly Sales</p>
                <h2>{{ stats()?.monthly?.total | currency }}</h2>
                <span>{{ stats()?.monthly?.count }} transactions</span>
              </div>
              <mat-icon>calendar_month</mat-icon>
            </mat-card-content>
          </mat-card>

          <!-- Total Products -->
          <mat-card class="stat-card products">
            <mat-card-content>
              <div class="stat-info">
                <p>Total Products</p>
                <h2>{{ stats()?.totalProducts }}</h2>
                <span>Active products</span>
              </div>
              <mat-icon>inventory_2</mat-icon>
            </mat-card-content>
          </mat-card>

          <!-- Total Customers -->
          <mat-card class="stat-card customers">
            <mat-card-content>
              <div class="stat-info">
                <p>Total Customers</p>
                <h2>{{ stats()?.totalCustomers }}</h2>
                <span>Registered customers</span>
              </div>
              <mat-icon>people</mat-icon>
            </mat-card-content>
          </mat-card>

        </div>

        <!-- Low Stock Alert -->
        @if (lowStockProducts().length > 0) {
          <mat-card class="alert-card">
            <mat-card-header>
              <mat-icon color="warn">warning</mat-icon>
              <mat-card-title>Low Stock Alert</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="low-stock-list">
                @for (product of lowStockProducts(); track product._id) {
                  <div class="low-stock-item">
                    <span class="product-name">{{ product.name }}</span>
                    <span class="product-sku">{{ product.sku }}</span>
                    <span class="stock-badge">{{ product.stock }} left</span>
                  </div>
                }
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/products">
                Manage Products
              </button>
            </mat-card-actions>
          </mat-card>
        }

        <!-- Quick Actions -->
        <mat-card class="quick-actions">
          <mat-card-header>
            <mat-card-title>Quick Actions</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="actions-grid">
              <button mat-raised-button color="primary" routerLink="/pos">
                <mat-icon>point_of_sale</mat-icon>
                New Sale
              </button>
              <button mat-raised-button routerLink="/products">
                <mat-icon>add_box</mat-icon>
                Add Product
              </button>
              <button mat-raised-button routerLink="/customers">
                <mat-icon>person_add</mat-icon>
                Add Customer
              </button>
              <button mat-raised-button routerLink="/reports">
                <mat-icon>bar_chart</mat-icon>
                View Reports
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .dashboard { padding: 8px; }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card mat-card-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px !important;
    }

    .stat-info p {
      margin: 0;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.8);
    }

    .stat-info h2 {
      margin: 4px 0;
      font-size: 1.8rem;
      font-weight: 700;
      color: white;
    }

    .stat-info span {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.7);
    }

    .stat-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: rgba(255,255,255,0.5);
    }

    .today    { background: linear-gradient(135deg, #1a237e, #3949ab); color: white; }
    .monthly  { background: linear-gradient(135deg, #1b5e20, #43a047); color: white; }
    .products { background: linear-gradient(135deg, #e65100, #fb8c00); color: white; }
    .customers{ background: linear-gradient(135deg, #4a148c, #8e24aa); color: white; }

    .alert-card {
      margin-bottom: 24px;
      border-left: 4px solid #f44336;
    }

    .alert-card mat-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 16px 0;
    }

    .low-stock-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

    .low-stock-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #fff3e0;
      border-radius: 8px;
    }

    .product-name { font-weight: 500; flex: 1; }
    .product-sku  { color: #666; font-size: 0.85rem; }

    .stock-badge {
      background: #f44336;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .quick-actions mat-card-content { padding: 16px !important; }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .actions-grid button {
      height: 56px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private reportService = inject(ReportService);

  // 🔷 Signals
  isLoading = signal<boolean>(false);
  stats = computed(() => this.reportService.dashboardStats() as DashboardStats | null);
  lowStockProducts = computed(() => this.stats()?.lowStockProducts ?? []);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.reportService.getDashboardStats().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }
}