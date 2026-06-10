import { Component, Input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { AnalyticsReport, ReportService } from '../../core/services/report.service';

Chart.register(...registerables);

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card class="report-list-card">
      <mat-card-header>
        <mat-card-title>{{ title }}</mat-card-title>
        <mat-card-subtitle>{{ items.length }} rows</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (items.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  @for (column of columns; track column.key) {
                    <th>{{ column.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (item of items; track $index) {
                  <tr>
                    @for (column of columns; track column.key) {
                      <td>{{ display(item, column) }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state">No records found</div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .report-list-card {
      border: 1px solid #e6ecf2;
      border-radius: 12px !important;
      box-shadow: 0 8px 22px rgba(22, 36, 56, 0.07) !important;
    }

    .table-wrap {
      max-height: 360px;
      overflow: auto;
      border: 1px solid #edf1f5;
      border-radius: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 520px;
      font-size: 0.86rem;
    }

    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #edf1f5;
      text-align: left;
      white-space: nowrap;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f7f9fc;
      color: #5d6b7b;
      font-size: 0.74rem;
      font-weight: 900;
      text-transform: uppercase;
    }

    td {
      color: #172033;
      font-weight: 700;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .empty-state {
      display: grid;
      place-items: center;
      min-height: 140px;
      color: #8290a1;
      font-weight: 800;
    }
  `],
})
export class ReportListComponent {
  @Input() title = '';
  @Input() items: any[] = [];
  @Input() columns: { label: string; key: string; type?: string }[] = [];

  display(item: any, column: { key: string; type?: string }): string {
    const value = item?.[column.key];
    if (column.type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(value || 0));
    }
    if (value === null || value === undefined || value === '') return '-';
    return String(value).replace(/_/g, ' ');
  }
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    ReportListComponent,
  ],
  template: `
    <div class="reports-shell">
      <section class="reports-hero">
        <div>
          <p class="eyebrow">Reports and analytics</p>
          <h1>
            <mat-icon>query_stats</mat-icon>
            Business Reports
          </h1>
        </div>
        <div class="filter-actions">
          <mat-form-field appearance="outline">
            <mat-label>Start Date</mat-label>
            <input matInput type="date" [(ngModel)]="startDate"/>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>End Date</mat-label>
            <input matInput type="date" [(ngModel)]="endDate"/>
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="loadReports()">
            <mat-icon>filter_alt</mat-icon>
            Apply
          </button>
          <button mat-stroked-button (click)="resetFilters()">
            <mat-icon>restart_alt</mat-icon>
            Reset
          </button>
        </div>
      </section>

      @if (reportService.isLoading() && !report()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else if (report()) {
        <section class="metric-grid">
          @for (metric of metrics(); track metric.label) {
            <mat-card class="metric-card" [class]="metric.tone">
              <mat-card-content>
                <mat-icon>{{ metric.icon }}</mat-icon>
                <div>
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  <small>{{ metric.caption }}</small>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </section>

        <section class="insight-grid">
          @for (insight of report()!.insights; track insight) {
            <mat-card class="insight-card">
              <mat-card-content>
                <mat-icon>tips_and_updates</mat-icon>
                <span>{{ insight }}</span>
              </mat-card-content>
            </mat-card>
          }
        </section>

        <nav class="report-segments" aria-label="Report sections">
          @for (section of sections; track section.value) {
            <button
              mat-stroked-button
              type="button"
              [class.active]="activeSection() === section.value"
              (click)="activeSection.set(section.value)">
              <mat-icon>{{ section.icon }}</mat-icon>
              {{ section.label }}
            </button>
          }
        </nav>

        @switch (activeSection()) {
          @case ('charts') {
            <section class="tab-panel chart-grid">
              <mat-card class="chart-card wide">
                <mat-card-header>
                  <mat-card-title>Sales Trend</mat-card-title>
                  <mat-card-subtitle>Daily sales and profit</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <canvas baseChart [data]="salesTrendData" [options]="lineOptions" type="line"></canvas>
                </mat-card-content>
              </mat-card>

              <mat-card class="chart-card">
                <mat-card-header>
                  <mat-card-title>Revenue by Category</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <canvas baseChart [data]="categoryData" [options]="doughnutOptions" type="doughnut"></canvas>
                </mat-card-content>
              </mat-card>

              <mat-card class="chart-card">
                <mat-card-header>
                  <mat-card-title>Payment Methods</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <canvas baseChart [data]="paymentData" [options]="doughnutOptions" type="doughnut"></canvas>
                </mat-card-content>
              </mat-card>

              <mat-card class="chart-card wide">
                <mat-card-header>
                  <mat-card-title>Top 10 Products</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <canvas baseChart [data]="topProductsData" [options]="barOptions" type="bar"></canvas>
                </mat-card-content>
              </mat-card>

              <mat-card class="chart-card">
                <mat-card-header>
                  <mat-card-title>Monthly Profit</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <canvas baseChart [data]="monthlyProfitData" [options]="lineOptions" type="line"></canvas>
                </mat-card-content>
              </mat-card>

              <mat-card class="chart-card">
                <mat-card-header>
                  <mat-card-title>Stock Movement</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <canvas baseChart [data]="stockMovementData" [options]="stackedOptions" type="bar"></canvas>
                </mat-card-content>
              </mat-card>
            </section>
          }

          @case ('sales') {
            <section class="tab-panel report-grid">
              <app-report-list
                title="Daily Sales Report"
                [items]="report()!.dailySales"
                [columns]="dailyColumns">
              </app-report-list>
              <app-report-list
                title="Monthly Sales Report"
                [items]="report()!.monthlySales"
                [columns]="monthlyColumns">
              </app-report-list>
              <app-report-list
                title="Profit Report"
                [items]="report()!.profitReport"
                [columns]="profitColumns">
              </app-report-list>
              <app-report-list
                title="Category-wise Sales"
                [items]="report()!.categorySales"
                [columns]="categoryColumns">
              </app-report-list>
              <app-report-list
                title="Product-wise Sales"
                [items]="report()!.productSales"
                [columns]="productColumns">
              </app-report-list>
              <app-report-list
                title="Cashier-wise Sales"
                [items]="report()!.cashierSales"
                [columns]="cashierColumns">
              </app-report-list>
              <app-report-list
                title="Customer-wise Sales"
                [items]="report()!.customerSales"
                [columns]="customerColumns">
              </app-report-list>
            </section>
          }

          @case ('stock') {
            <section class="tab-panel report-grid">
              <mat-card class="inventory-summary">
                <mat-card-header>
                  <mat-card-title>Inventory Report</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div>
                    <span>Total products</span>
                    <strong>{{ report()!.inventoryReport.totalProducts }}</strong>
                  </div>
                  <div>
                    <span>Inventory value</span>
                    <strong>{{ report()!.inventoryReport.totalInventoryValue | currency }}</strong>
                  </div>
                  <div>
                    <span>Low stock items</span>
                    <strong>{{ report()!.inventoryReport.lowStockCount }}</strong>
                  </div>
                </mat-card-content>
              </mat-card>

              <app-report-list
                title="Low Stock Report"
                [items]="report()!.lowStockReport"
                [columns]="lowStockColumns">
              </app-report-list>
              <app-report-list
                title="Stock Movement"
                [items]="stockMovementRows()"
                [columns]="stockColumns">
              </app-report-list>
            </section>
          }

          @case ('finance') {
            <section class="tab-panel report-grid">
              <app-report-list
                title="Refund Report by Reason"
                [items]="report()!.refundReport.reasons"
                [columns]="refundReasonColumns">
              </app-report-list>
              <app-report-list
                title="Refund Report by Method"
                [items]="report()!.refundReport.methods"
                [columns]="refundMethodColumns">
              </app-report-list>
              <app-report-list
                title="Discount Report"
                [items]="report()!.discountReport.byType"
                [columns]="discountColumns">
              </app-report-list>
              <app-report-list
                title="Coupon Report"
                [items]="report()!.discountReport.coupons"
                [columns]="couponColumns">
              </app-report-list>
              <app-report-list
                title="Tax Report"
                [items]="report()!.taxReport"
                [columns]="taxColumns">
              </app-report-list>
              <app-report-list
                title="Payment Method Report"
                [items]="report()!.paymentMethodReport"
                [columns]="paymentColumns">
              </app-report-list>
            </section>
          }
        }
      }
    </div>
  `,
  styles: [`
    .reports-shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: #172033;
    }

    .reports-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 18px;
      border: 1px solid #e6ecf2;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 12px 28px rgba(22, 36, 56, 0.08);
    }

    .eyebrow {
      margin: 0 0 5px;
      color: #6e7c8d;
      font-size: 0.78rem;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 1.55rem;
      font-weight: 900;
    }

    .filter-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .filter-actions mat-form-field {
      width: 160px;
      margin-bottom: -18px;
    }

    .metric-grid,
    .insight-grid,
    .chart-grid,
    .report-grid {
      display: grid;
      gap: 12px;
    }

    .metric-grid {
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    }

    .metric-card,
    .insight-card,
    .chart-card,
    .inventory-summary {
      border: 1px solid #e6ecf2;
      border-radius: 12px !important;
      box-shadow: 0 8px 22px rgba(22, 36, 56, 0.07) !important;
    }

    .metric-card mat-card-content,
    .insight-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px !important;
    }

    .metric-card mat-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #eef7f4;
      color: #16665c;
      font-size: 25px;
    }

    .metric-card.warning mat-icon { background: #fff5e5; color: #a95f00; }
    .metric-card.danger mat-icon { background: #fff0f0; color: #b3262e; }
    .metric-card.blue mat-icon { background: #edf5ff; color: #245aa7; }

    .metric-card span,
    .metric-card small,
    .inventory-summary span {
      color: #6e7c8d;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .metric-card strong {
      display: block;
      margin-top: 2px;
      font-size: 1.25rem;
      font-weight: 900;
    }

    .insight-grid {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .insight-card mat-icon {
      color: #9a6a00;
    }

    .insight-card span {
      font-weight: 800;
      line-height: 1.35;
    }

    .tab-panel {
      padding: 16px 0;
    }

    .report-segments {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 6px;
      border: 1px solid #e6ecf2;
      border-radius: 12px;
      background: #f8fafc;
    }

    .report-segments button {
      min-width: 110px;
      border-radius: 8px;
    }

    .report-segments button.active {
      background: #245aa7;
      color: white;
    }

    .chart-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
    }

    .chart-card.wide {
      grid-column: span 2;
    }

    .chart-card mat-card-content {
      height: 300px;
    }

    .chart-card.wide mat-card-content {
      height: 340px;
    }

    canvas {
      max-height: 100%;
    }

    .report-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }

    .inventory-summary mat-card-content {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .inventory-summary div {
      display: grid;
      gap: 4px;
      padding: 12px;
      border: 1px solid #edf1f5;
      border-radius: 10px;
      background: #fbfcfe;
    }

    .inventory-summary strong {
      font-size: 1.05rem;
      font-weight: 900;
    }

    .loading {
      display: grid;
      place-items: center;
      min-height: 360px;
    }

    @media (max-width: 1020px) {
      .reports-hero {
        align-items: stretch;
        flex-direction: column;
      }

      .chart-grid,
      .report-grid,
      .chart-card.wide,
      .inventory-summary mat-card-content {
        grid-template-columns: 1fr;
        grid-column: span 1;
      }
    }

    @media (max-width: 680px) {
      .filter-actions,
      .filter-actions mat-form-field,
      .filter-actions button {
        width: 100%;
      }
    }
  `],
})
export class ReportsComponent implements OnInit {
  reportService = inject(ReportService);

  startDate = '';
  endDate = '';
  report = signal<AnalyticsReport | null>(null);
  activeSection = signal<'charts' | 'sales' | 'stock' | 'finance'>('charts');
  sections: { label: string; value: 'charts' | 'sales' | 'stock' | 'finance'; icon: string }[] = [
    { label: 'Charts', value: 'charts', icon: 'insert_chart' },
    { label: 'Sales', value: 'sales', icon: 'receipt_long' },
    { label: 'Stock', value: 'stock', icon: 'inventory_2' },
    { label: 'Finance', value: 'finance', icon: 'payments' },
  ];

  salesTrendData: ChartData<'line'> = { labels: [], datasets: [] };
  categoryData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  topProductsData: ChartData<'bar'> = { labels: [], datasets: [] };
  paymentData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  monthlyProfitData: ChartData<'line'> = { labels: [], datasets: [] };
  stockMovementData: ChartData<'bar'> = { labels: [], datasets: [] };

  lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } },
  };

  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  stackedOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  };

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  dailyColumns = [
    { label: 'Date', key: '_id' },
    { label: 'Orders', key: 'orders' },
    { label: 'Revenue', key: 'revenue', type: 'currency' },
    { label: 'Profit', key: 'profit', type: 'currency' },
  ];
  monthlyColumns = [
    { label: 'Month', key: '_id' },
    { label: 'Orders', key: 'orders' },
    { label: 'Revenue', key: 'revenue', type: 'currency' },
  ];
  profitColumns = [
    { label: 'Month', key: '_id' },
    { label: 'Revenue', key: 'revenue', type: 'currency' },
    { label: 'Profit', key: 'profit', type: 'currency' },
  ];
  categoryColumns = [
    { label: 'Category', key: '_id' },
    { label: 'Qty', key: 'quantity' },
    { label: 'Revenue', key: 'revenue', type: 'currency' },
    { label: 'Profit', key: 'profit', type: 'currency' },
  ];
  productColumns = [
    { label: 'Product', key: 'name' },
    { label: 'SKU', key: 'sku' },
    { label: 'Qty', key: 'quantity' },
    { label: 'Revenue', key: 'revenue', type: 'currency' },
  ];
  cashierColumns = [
    { label: 'Cashier', key: 'name' },
    { label: 'Orders', key: 'orders' },
    { label: 'Revenue', key: 'revenue', type: 'currency' },
    { label: 'Profit', key: 'profit', type: 'currency' },
  ];
  customerColumns = [
    { label: 'Customer', key: 'name' },
    { label: 'Orders', key: 'orders' },
    { label: 'Revenue', key: 'revenue', type: 'currency' },
  ];
  lowStockColumns = [
    { label: 'Product', key: 'name' },
    { label: 'SKU', key: 'sku' },
    { label: 'Stock', key: 'stock' },
    { label: 'Reorder', key: 'reorderLevel' },
  ];
  stockColumns = [
    { label: 'Day', key: 'day' },
    { label: 'Type', key: 'type' },
    { label: 'Qty', key: 'quantity' },
  ];
  refundReasonColumns = [
    { label: 'Reason', key: '_id' },
    { label: 'Qty', key: 'quantity' },
    { label: 'Refund', key: 'refundAmount', type: 'currency' },
  ];
  refundMethodColumns = [
    { label: 'Method', key: '_id' },
    { label: 'Returns', key: 'count' },
    { label: 'Refund', key: 'refundAmount', type: 'currency' },
  ];
  discountColumns = [
    { label: 'Type', key: '_id' },
    { label: 'Count', key: 'count' },
    { label: 'Amount', key: 'amount', type: 'currency' },
  ];
  couponColumns = [
    { label: 'Coupon', key: '_id' },
    { label: 'Orders', key: 'orders' },
    { label: 'Discount', key: 'amount', type: 'currency' },
  ];
  taxColumns = [
    { label: 'Date', key: '_id' },
    { label: 'Orders', key: 'orders' },
    { label: 'Taxable Sales', key: 'taxableSales', type: 'currency' },
    { label: 'Tax', key: 'tax', type: 'currency' },
  ];
  paymentColumns = [
    { label: 'Method', key: '_id' },
    { label: 'Count', key: 'count' },
    { label: 'Revenue', key: 'revenue', type: 'currency' },
  ];

  ngOnInit(): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    this.startDate = this.dateInput(monthStart);
    this.endDate = this.dateInput(now);
    this.loadReports();
  }

  loadReports(): void {
    const params: any = {};
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;

    this.reportService.getAnalyticsReport(params).subscribe((res) => {
      this.report.set(res.report);
      this.buildCharts(res.report);
    });
  }

  resetFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadReports();
  }

  metrics(): { label: string; value: string; caption: string; icon: string; tone: string }[] {
    const summary = this.report()?.summary;
    if (!summary) return [];
    return [
      { label: 'Revenue', value: this.money(summary.revenue), caption: `${summary.orders} orders`, icon: 'payments', tone: 'blue' },
      { label: 'Profit', value: this.money(summary.profit), caption: 'Net after product cost', icon: 'trending_up', tone: '' },
      { label: 'Refunds', value: this.money(summary.refundAmount), caption: `${summary.returns} returns`, icon: 'assignment_return', tone: 'danger' },
      { label: 'Discounts', value: this.money(summary.discount), caption: 'All discount types', icon: 'sell', tone: 'warning' },
      { label: 'Tax', value: this.money(summary.tax), caption: 'Collected tax', icon: 'receipt', tone: '' },
      { label: 'Inventory Value', value: this.money(summary.inventoryValue), caption: `${summary.lowStockCount} low stock`, icon: 'inventory_2', tone: 'blue' },
    ];
  }

  stockMovementRows(): any[] {
    return (this.report()?.stockMovement || []).map((row) => ({
      day: row._id?.day,
      type: this.label(row._id?.type),
      quantity: row.quantity,
    }));
  }

  private buildCharts(report: AnalyticsReport): void {
    const palette = ['#245aa7', '#16735f', '#c58a16', '#8a4f9d', '#d14d5a', '#455a64', '#00838f', '#7a6b2f'];

    this.salesTrendData = {
      labels: report.dailySales.map((row) => row._id),
      datasets: [
        {
          label: 'Revenue',
          data: report.dailySales.map((row) => row.revenue),
          borderColor: '#245aa7',
          backgroundColor: 'rgba(36, 90, 167, 0.14)',
          tension: 0.25,
          fill: true,
        },
        {
          label: 'Profit',
          data: report.dailySales.map((row) => row.profit),
          borderColor: '#16735f',
          backgroundColor: 'rgba(22, 115, 95, 0.12)',
          tension: 0.25,
        },
      ],
    };

    this.categoryData = {
      labels: report.categorySales.map((row) => row._id),
      datasets: [{ data: report.categorySales.map((row) => row.revenue), backgroundColor: palette }],
    };

    this.topProductsData = {
      labels: report.productSales.map((row) => row.name),
      datasets: [{ label: 'Qty sold', data: report.productSales.map((row) => row.quantity), backgroundColor: '#245aa7' }],
    };

    this.paymentData = {
      labels: report.paymentMethodReport.map((row) => this.label(row._id)),
      datasets: [{ data: report.paymentMethodReport.map((row) => row.revenue), backgroundColor: palette }],
    };

    this.monthlyProfitData = {
      labels: report.monthlySales.map((row) => row._id),
      datasets: [{
        label: 'Monthly Profit',
        data: report.monthlySales.map((row) => row.profit),
        borderColor: '#16735f',
        backgroundColor: 'rgba(22, 115, 95, 0.14)',
        fill: true,
        tension: 0.25,
      }],
    };

    this.stockMovementData = this.buildStockMovementChart(report.stockMovement, palette);
  }

  private buildStockMovementChart(rows: any[], palette: string[]): ChartData<'bar'> {
    const days = [...new Set(rows.map((row) => row._id?.day).filter(Boolean))];
    const types = [...new Set(rows.map((row) => row._id?.type).filter(Boolean))];
    return {
      labels: days,
      datasets: types.map((type, index) => ({
        label: this.label(type),
        data: days.map((day) =>
          rows.find((row) => row._id?.day === day && row._id?.type === type)?.quantity || 0
        ),
        backgroundColor: palette[index % palette.length],
      })),
    };
  }

  private money(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  private label(value: string): string {
    return String(value || 'Unknown')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private dateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
