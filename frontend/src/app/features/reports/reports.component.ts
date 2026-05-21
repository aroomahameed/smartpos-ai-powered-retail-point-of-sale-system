import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, registerables, Chart } from 'chart.js';
import { ReportService } from '../../core/services/report.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    BaseChartDirective,
  ],
  template: `
    <div class="reports-container">

      <!-- Header -->
      <div class="page-header">
        <h1>
          <mat-icon>bar_chart</mat-icon>
          Reports & Analytics
        </h1>
      </div>

      <!-- Date Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-grid">
            <mat-form-field appearance="outline">
              <mat-label>Start Date</mat-label>
              <input matInput type="date" [(ngModel)]="startDate"/>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>End Date</mat-label>
              <input matInput type="date" [(ngModel)]="endDate"/>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="loadReports()">
              <mat-icon>filter_list</mat-icon>
              Apply
            </button>
            <button mat-stroked-button (click)="resetFilters()">
              <mat-icon>clear</mat-icon>
              Reset
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      @if (reportService.isLoading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {

        <mat-tab-group>

          <!-- Sales Report Tab -->
          <mat-tab label="Sales Report">
            <div class="tab-content">

              <!-- Sales By Day Chart -->
              @if (salesByDayData.labels!.length > 0) {
                <mat-card class="chart-card">
                  <mat-card-header>
                    <mat-card-title>Sales By Day</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <canvas baseChart
                      [data]="salesByDayData"
                      [options]="barOptions"
                      type="bar">
                    </canvas>
                  </mat-card-content>
                </mat-card>
              }

              <!-- Payment Breakdown Chart -->
              @if (paymentData.labels!.length > 0) {
                <mat-card class="chart-card">
                  <mat-card-header>
                    <mat-card-title>Payment Methods</mat-card-title>
                  </mat-card-header>
                  <mat-card-content class="pie-content">
                    <canvas baseChart
                      [data]="paymentData"
                      [options]="pieOptions"
                      type="pie">
                    </canvas>
                  </mat-card-content>
                </mat-card>
              }

              <!-- Top Products -->
              @if (topProducts().length > 0) {
                <mat-card>
                  <mat-card-header>
                    <mat-card-title>Top Selling Products</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <table mat-table [dataSource]="topProducts()"
                      class="report-table">

                      <ng-container matColumnDef="name">
                        <th mat-header-cell *matHeaderCellDef>Product</th>
                        <td mat-cell *matCellDef="let p">{{ p.name }}</td>
                      </ng-container>

                      <ng-container matColumnDef="sku">
                        <th mat-header-cell *matHeaderCellDef>SKU</th>
                        <td mat-cell *matCellDef="let p">{{ p.sku }}</td>
                      </ng-container>

                      <ng-container matColumnDef="quantity">
                        <th mat-header-cell *matHeaderCellDef>Qty Sold</th>
                        <td mat-cell *matCellDef="let p">{{ p.totalQuantity }}</td>
                      </ng-container>

                      <ng-container matColumnDef="revenue">
                        <th mat-header-cell *matHeaderCellDef>Revenue</th>
                        <td mat-cell *matCellDef="let p">
                          {{ p.totalRevenue | currency }}
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="topProductColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: topProductColumns;">
                      </tr>
                    </table>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </mat-tab>

          <!-- Inventory Report Tab -->
          <mat-tab label="Inventory Report">
            <div class="tab-content">

              <!-- Inventory Stats -->
              <div class="stats-grid">
                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon>inventory_2</mat-icon>
                    <h3>{{ reportService.inventoryReport()?.totalProducts }}</h3>
                    <p>Total Products</p>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stat-card value">
                  <mat-card-content>
                    <mat-icon>attach_money</mat-icon>
                    <h3>
                      {{ reportService.inventoryReport()?.totalInventoryValue
                        | currency }}
                    </h3>
                    <p>Inventory Value</p>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stat-card warning">
                  <mat-card-content>
                    <mat-icon>warning</mat-icon>
                    <h3>{{ reportService.inventoryReport()?.lowStockCount }}</h3>
                    <p>Low Stock Items</p>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stat-card danger">
                  <mat-card-content>
                    <mat-icon>remove_shopping_cart</mat-icon>
                    <h3>{{ reportService.inventoryReport()?.outOfStockCount }}</h3>
                    <p>Out of Stock</p>
                  </mat-card-content>
                </mat-card>
              </div>

              <!-- Low Stock Products -->
              @if (reportService.inventoryReport()?.lowStockProducts?.length) {
                <mat-card>
                  <mat-card-header>
                    <mat-card-title>Low Stock Products</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <table mat-table
                      [dataSource]="reportService.inventoryReport()!.lowStockProducts"
                      class="report-table">

                      <ng-container matColumnDef="name">
                        <th mat-header-cell *matHeaderCellDef>Product</th>
                        <td mat-cell *matCellDef="let p">{{ p.name }}</td>
                      </ng-container>

                      <ng-container matColumnDef="sku">
                        <th mat-header-cell *matHeaderCellDef>SKU</th>
                        <td mat-cell *matCellDef="let p">{{ p.sku }}</td>
                      </ng-container>

                      <ng-container matColumnDef="stock">
                        <th mat-header-cell *matHeaderCellDef>Stock</th>
                        <td mat-cell *matCellDef="let p">
                          <span class="stock-badge low">{{ p.stock }}</span>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="alert">
                        <th mat-header-cell *matHeaderCellDef>Alert Level</th>
                        <td mat-cell *matCellDef="let p">{{ p.lowStockAlert }}</td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="inventoryColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: inventoryColumns;">
                      </tr>
                    </table>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </mat-tab>

        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .reports-container { padding: 8px; }

    .page-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.5rem;
    }

    .filters-card { margin-bottom: 16px; }

    .filters-grid {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .loading { display: flex; justify-content: center; padding: 48px; }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }

    .chart-card canvas { max-height: 300px; }
    .pie-content { max-width: 300px; margin: 0 auto; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .stat-card mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px !important;
      text-align: center;
    }

    .stat-card mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .stat-card h3 { font-size: 1.8rem; margin: 8px 0 4px; }
    .stat-card p  { margin: 0; color: #666; }

    .stat-card.value   mat-icon { color: #1b5e20; }
    .stat-card.warning mat-icon { color: #e65100; }
    .stat-card.danger  mat-icon { color: #c62828; }

    .report-table { width: 100%; }

    .stock-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.85rem;
    }

    .stock-badge.low { background: #fff3e0; color: #e65100; }
  `]
})
export class ReportsComponent implements OnInit {
  reportService = inject(ReportService);

  // 🔷 Signals
  startDate = '';
  endDate = '';

  topProductColumns = ['name', 'sku', 'quantity', 'revenue'];
  inventoryColumns  = ['name', 'sku', 'stock', 'alert'];

  // 🔷 Chart Data
  salesByDayData: ChartData<'bar'> = { labels: [], datasets: [] };
  paymentData: ChartData<'pie'>    = { labels: [], datasets: [] };

  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } },
  };

  pieOptions: ChartOptions<'pie'> = {
    responsive: true,
  };

  topProducts = signal<any[]>([]);

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    const params: any = {};
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate)   params.endDate   = this.endDate;

    // Sales Report
    this.reportService.getSalesReport(params).subscribe((res) => {
      const report = res.report;

      // Sales by day chart
      this.salesByDayData = {
        labels: report.salesByDay.map((d) => d._id),
        datasets: [{
          label: 'Sales',
          data: report.salesByDay.map((d) => d.total),
          backgroundColor: '#3949ab',
        }],
      };

      // Payment breakdown chart
      this.paymentData = {
        labels: report.paymentBreakdown.map((p) => p._id),
        datasets: [{
          data: report.paymentBreakdown.map((p) => p.total),
          backgroundColor: ['#43a047', '#1e88e5', '#8e24aa'],
        }],
      };

      this.topProducts.set(report.topProducts);
    });

    // Inventory Report
    this.reportService.getInventoryReport().subscribe();
  }

  resetFilters(): void {
    this.startDate = '';
    this.endDate   = '';
    this.loadReports();
  }
}