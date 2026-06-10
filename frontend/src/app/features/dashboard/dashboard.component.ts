import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { DashboardStats, ReportService } from '../../core/services/report.service';
import { SaleService } from '../../core/services/sale.service';
import { Sale } from '../../core/models/sale.model';

interface MetricCard {
  label: string;
  value: number;
  icon: string;
  hint: string;
  tone: string;
  format: 'currency' | 'number';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  template: `
    <div class="dashboard-shell">
      <section class="dashboard-hero">
        <div>
          <p class="eyebrow">Live sales overview</p>
          <h1>Dashboard</h1>
          <div class="hero-actions">
            <button mat-flat-button color="primary" routerLink="/pos">
              <mat-icon>point_of_sale</mat-icon>
              New Sale
            </button>
            <button mat-stroked-button routerLink="/reports">
              <mat-icon>bar_chart</mat-icon>
              Reports
            </button>
          </div>
        </div>

        <div class="hero-revenue">
          <span>Monthly Revenue</span>
          <strong>{{ stats()?.monthly?.total || 0 | currency:'USD':'symbol':'1.0-0' }}</strong>
          <small>{{ stats()?.monthly?.count || 0 }} orders this month</small>
        </div>
      </section>

      @if (isLoading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {
        <section class="metrics-grid">
          @for (card of metricCards(); track card.label) {
            <mat-card class="metric-card {{ card.tone }}">
              <mat-card-content>
                <div class="metric-icon">
                  <mat-icon>{{ card.icon }}</mat-icon>
                </div>
                <div>
                  <p>{{ card.label }}</p>
                  <h2>
                    @if (card.format === 'currency') {
                      {{ card.value | currency:'USD':'symbol':'1.0-0' }}
                    } @else {
                      {{ card.value | number }}
                    }
                  </h2>
                  <span>{{ card.hint }}</span>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </section>

        <section class="insight-grid">
          <mat-card class="spotlight-card">
            <mat-card-header>
              <mat-icon>workspace_premium</mat-icon>
              <mat-card-title>Top Selling Product</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (topSellingProduct()) {
                <div class="top-product">
                  <div>
                    <h3>{{ topSellingProduct()?.name }}</h3>
                    <p>{{ topSellingProduct()?.sku }}</p>
                  </div>
                  <div class="top-product-stats">
                    <strong>{{ topSellingProduct()?.totalQuantity || 0 | number }}</strong>
                    <span>units sold</span>
                  </div>
                </div>
                <mat-divider></mat-divider>
                <div class="spotlight-total">
                  <span>Revenue</span>
                  <strong>
                    {{ topSellingProduct()?.totalRevenue || 0 | currency:'USD':'symbol':'1.0-0' }}
                  </strong>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>inventory_2</mat-icon>
                  <p>No completed sales yet</p>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card class="inventory-card">
            <mat-card-header>
              <mat-icon>warning</mat-icon>
              <mat-card-title>Low Stock Items</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (lowStockProducts().length) {
                <div class="stock-list">
                  @for (product of lowStockProducts(); track product._id) {
                    <div class="stock-row">
                      <div>
                        <strong>{{ product.name }}</strong>
                        <span>{{ product.sku }} - Min {{ product.reorderLevel || product.lowStockAlert }}</span>
                        <span>Suggested Action: Reorder</span>
                      </div>
                      <mat-chip>{{ product.stock }} left</mat-chip>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>check_circle</mat-icon>
                  <p>Inventory levels look healthy</p>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </section>

        @if (expiringSoonProducts().length) {
          <mat-card class="inventory-card">
            <mat-card-header>
              <mat-icon>event_busy</mat-icon>
              <mat-card-title>Expiring Soon</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="stock-list">
                @for (product of expiringSoonProducts(); track product._id) {
                  <div class="stock-row">
                    <div>
                      <strong>{{ product.name }}</strong>
                      <span>Batch: {{ product.batchNumber || '-' }}</span>
                      <span>Expiry: {{ product.expiryDate | date:'mediumDate' }}</span>
                    </div>
                    <mat-chip>Review</mat-chip>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <mat-card class="sales-detail-card">
          <mat-card-header>
            <div>
              <mat-card-title>All Sales Detail</mat-card-title>
              <mat-card-subtitle>{{ sales().length }} orders loaded</mat-card-subtitle>
            </div>
            <button mat-stroked-button routerLink="/sales">
              <mat-icon>receipt_long</mat-icon>
              Open Sales
            </button>
          </mat-card-header>

          <mat-card-content>
            @if (sales().length) {
              <div class="table-wrap">
                <table mat-table [dataSource]="sales()" class="sales-table">
                  <ng-container matColumnDef="invoice">
                    <th mat-header-cell *matHeaderCellDef>Invoice</th>
                    <td mat-cell *matCellDef="let sale">
                      <strong>{{ sale.invoiceNumber }}</strong>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>Date</th>
                    <td mat-cell *matCellDef="let sale">
                      {{ sale.createdAt | date:'mediumDate' }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="customer">
                    <th mat-header-cell *matHeaderCellDef>Customer</th>
                    <td mat-cell *matCellDef="let sale">
                      {{ sale.customer?.name || 'Walk-in' }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="cashier">
                    <th mat-header-cell *matHeaderCellDef>Cashier</th>
                    <td mat-cell *matCellDef="let sale">
                      {{ sale.cashier?.name || '-' }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="items">
                    <th mat-header-cell *matHeaderCellDef>Items</th>
                    <td mat-cell *matCellDef="let sale">
                      {{ sale.items.length }} items
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="payment">
                    <th mat-header-cell *matHeaderCellDef>Payment</th>
                    <td mat-cell *matCellDef="let sale">
                      <span class="pill payment {{ sale.paymentMethod }}">
                        {{ sale.paymentMethod | titlecase }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let sale">
                      <span class="pill status {{ sale.status }}">
                        {{ sale.status | titlecase }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="profit">
                    <th mat-header-cell *matHeaderCellDef>Profit</th>
                    <td mat-cell *matCellDef="let sale">
                      {{ saleProfit(sale) | currency:'USD':'symbol':'1.0-0' }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef>Total</th>
                    <td mat-cell *matCellDef="let sale">
                      <strong>{{ sale.total | currency:'USD':'symbol':'1.0-0' }}</strong>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                </table>
              </div>
            } @else {
              <div class="empty-state table-empty">
                <mat-icon>receipt_long</mat-icon>
                <p>No sales found</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .dashboard-shell {
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: #172033;
    }

    .dashboard-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 20px;
      align-items: stretch;
      padding: 24px;
      border-radius: 24px;
      background:
        linear-gradient(135deg, rgba(13, 31, 45, 0.94), rgba(33, 74, 91, 0.9)),
        radial-gradient(circle at 85% 10%, rgba(118, 196, 180, 0.55), transparent 34%);
      color: white;
      box-shadow: 0 18px 45px rgba(18, 39, 54, 0.2);
    }

    .eyebrow {
      margin: 0 0 6px;
      color: rgba(255,255,255,0.72);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 2.25rem;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: 0;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 22px;
    }

    .hero-actions button,
    .sales-detail-card mat-card-header button {
      border-radius: 8px;
    }

    .hero-revenue {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      padding: 20px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 18px;
      background: rgba(255,255,255,0.11);
    }

    .hero-revenue span,
    .hero-revenue small {
      color: rgba(255,255,255,0.75);
    }

    .hero-revenue strong {
      font-size: 2rem;
      line-height: 1.1;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 56px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(170px, 1fr));
      gap: 14px;
    }

    .metric-card {
      border-radius: 16px;
      color: white;
      border: 0;
      box-shadow: 0 14px 30px rgba(16, 24, 39, 0.16);
      overflow: hidden;
    }

    .metric-card.blue {
      background: linear-gradient(135deg, #255da8, #153b74);
    }

    .metric-card.green {
      background: linear-gradient(135deg, #0f8f78, #0b695d);
    }

    .metric-card.amber {
      background: linear-gradient(135deg, #d98b18, #9a5d0d);
    }

    .metric-card.red {
      background: linear-gradient(135deg, #bf2d3a, #7d1f2b);
    }

    .metric-card.slate {
      background: linear-gradient(135deg, #334155, #101827);
    }

    .metric-card mat-card-content {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding: 18px !important;
    }

    .metric-icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      border-radius: 12px;
      background: rgba(255,255,255,0.16);
      color: white;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14);
    }

    .metric-card p,
    .metric-card h2,
    .metric-card span {
      margin: 0;
      color: white;
    }

    .metric-card p {
      font-size: 0.82rem;
      font-weight: 700;
      opacity: 0.84;
    }

    .metric-card h2 {
      margin-top: 5px;
      font-size: 1.45rem;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: 0;
    }

    .metric-card span {
      display: block;
      margin-top: 5px;
      font-size: 0.78rem;
      opacity: 0.76;
    }

    .insight-grid {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 16px;
    }

    .spotlight-card,
    .inventory-card,
    .sales-detail-card {
      border-radius: 16px;
      border: 1px solid #edf1f5;
      box-shadow: 0 10px 26px rgba(25, 45, 70, 0.07);
    }

    mat-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 18px 0;
    }

    mat-card-title {
      font-size: 1rem;
      font-weight: 800;
    }

    .top-product {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin: 6px 0 16px;
    }

    .top-product h3 {
      margin: 0 0 4px;
      font-size: 1.45rem;
      letter-spacing: 0;
    }

    .top-product p,
    .top-product-stats span,
    .spotlight-total span,
    .stock-row span {
      margin: 0;
      color: #768394;
      font-size: 0.84rem;
    }

    .top-product-stats {
      min-width: 110px;
      text-align: right;
    }

    .top-product-stats strong {
      display: block;
      font-size: 1.8rem;
      line-height: 1;
    }

    .spotlight-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
    }

    .stock-list {
      display: grid;
      gap: 10px;
      max-height: 210px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .stock-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #f7f9fb;
    }

    .stock-row div {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .stock-row strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    mat-chip {
      min-height: 28px;
      border-radius: 999px;
      background: #fff0f0 !important;
      color: #a7282e !important;
      font-weight: 700;
    }

    .sales-detail-card mat-card-header {
      justify-content: space-between;
      gap: 16px;
    }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid #edf1f5;
      border-radius: 14px;
    }

    .sales-table {
      width: 100%;
      min-width: 980px;
    }

    .sales-table th {
      color: #667085;
      font-size: 0.76rem;
      font-weight: 800;
      background: #f8fafc;
    }

    .sales-table td {
      color: #243043;
      font-size: 0.86rem;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 76px;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 800;
    }

    .payment.cash,
    .status.completed {
      background: #e9f8ef;
      color: #1d773d;
    }

    .payment.card {
      background: #eaf2ff;
      color: #2457a6;
    }

    .payment.mobile {
      background: #f2ecff;
      color: #6541a5;
    }

    .payment.split {
      background: #e0f7fa;
      color: #006064;
    }

    .status.refunded {
      background: #fff4df;
      color: #975f00;
    }

    .status.cancelled {
      background: #fff0f0;
      color: #a7282e;
    }

    .empty-state {
      display: grid;
      place-items: center;
      gap: 8px;
      min-height: 140px;
      color: #7b8794;
      text-align: center;
    }

    .empty-state mat-icon {
      width: 42px;
      height: 42px;
      font-size: 42px;
      color: #9aa6b2;
    }

    .empty-state p {
      margin: 0;
    }

    .table-empty {
      min-height: 220px;
      border: 1px solid #edf1f5;
      border-radius: 14px;
    }

    @media (max-width: 1180px) {
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(170px, 1fr));
      }
    }

    @media (max-width: 860px) {
      .dashboard-hero,
      .insight-grid {
        grid-template-columns: 1fr;
      }

      .hero-revenue {
        min-height: 120px;
      }
    }

    @media (max-width: 620px) {
      .dashboard-shell {
        gap: 14px;
      }

      .dashboard-hero {
        padding: 18px;
        border-radius: 18px;
      }

      h1 {
        font-size: 1.75rem;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .sales-detail-card mat-card-header {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private reportService = inject(ReportService);
  private saleService = inject(SaleService);

  isLoading = signal<boolean>(false);
  stats = computed(() => this.reportService.dashboardStats() as DashboardStats | null);
  sales = computed(() => this.saleService.sales());
  lowStockProducts = computed(() => this.stats()?.lowStockProducts ?? []);
  expiringSoonProducts = computed(() => this.stats()?.expiringSoonProducts ?? []);
  topSellingProduct = computed(() => this.stats()?.topSellingProduct ?? null);

  displayedColumns = [
    'invoice',
    'date',
    'customer',
    'cashier',
    'items',
    'payment',
    'status',
    'profit',
    'total',
  ];

  metricCards = computed<MetricCard[]>(() => {
    const stats = this.stats();

    return [
      {
        label: "Today's Sales",
        value: stats?.today?.total || 0,
        icon: 'payments',
        hint: `${stats?.today?.count || 0} orders today`,
        tone: 'blue',
        format: 'currency',
      },
      {
        label: "Today's Profit",
        value: stats?.today?.profit || 0,
        icon: 'trending_up',
        hint: 'Net of product cost',
        tone: 'green',
        format: 'currency',
      },
      {
        label: 'Total Orders',
        value: stats?.totalOrders || 0,
        icon: 'receipt_long',
        hint: 'All recorded orders',
        tone: 'slate',
        format: 'number',
      },
      {
        label: 'Low Stock Items',
        value: stats?.lowStockCount || 0,
        icon: 'inventory',
        hint: 'At or below reorder level',
        tone: 'amber',
        format: 'number',
      },
      {
        label: 'Top Selling Product',
        value: stats?.topSellingProduct?.totalQuantity || 0,
        icon: 'leaderboard',
        hint: stats?.topSellingProduct?.name || 'No sales yet',
        tone: 'green',
        format: 'number',
      },
      {
        label: 'Pending Returns',
        value: stats?.pendingReturns || 0,
        icon: 'assignment_return',
        hint: 'Awaiting review',
        tone: 'red',
        format: 'number',
      },
      {
        label: 'Total Customers',
        value: stats?.totalCustomers || 0,
        icon: 'groups',
        hint: 'Active customer profiles',
        tone: 'blue',
        format: 'number',
      },
      {
        label: 'Monthly Revenue',
        value: stats?.monthly?.total || 0,
        icon: 'calendar_month',
        hint: `${stats?.monthly?.count || 0} orders this month`,
        tone: 'green',
        format: 'currency',
      },
    ];
  });

  ngOnInit(): void {
    this.isLoading.set(true);

    forkJoin([
      this.reportService.getDashboardStats(),
      this.saleService.getSales(),
    ]).subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }

  saleProfit(sale: Sale): number {
    const totalCost = sale.items.reduce(
      (sum, item) => sum + item.cost * item.quantity,
      0
    );

    return sale.subtotal - sale.discount - totalCost;
  }
}
