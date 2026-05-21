import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { SaleService } from '../../core/services/sale.service';
import { Sale } from '../../core/models/sale.model';

@Component({
  selector: 'app-sales',
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
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule,
  ],
  template: `
    <div class="sales-container">

      <!-- Header -->
      <div class="page-header">
        <h1>
          <mat-icon>receipt_long</mat-icon>
          Sales History
        </h1>
      </div>

      <!-- Filters -->
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
            <button mat-raised-button color="primary" (click)="loadSales()">
              <mat-icon>filter_list</mat-icon>
              Filter
            </button>
            <button mat-stroked-button (click)="resetFilters()">
              <mat-icon>clear</mat-icon>
              Reset
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Sales Table -->
      @if (saleService.isLoading()) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <mat-card>
          <table mat-table [dataSource]="saleService.sales()" class="sales-table">

            <ng-container matColumnDef="invoice">
              <th mat-header-cell *matHeaderCellDef>Invoice</th>
              <td mat-cell *matCellDef="let s">
                <strong>{{ s.invoiceNumber }}</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let s">
                {{ s.createdAt | date:'medium' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let s">
                {{ s.customer?.name || 'Walk-in' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="items">
              <th mat-header-cell *matHeaderCellDef>Items</th>
              <td mat-cell *matCellDef="let s">
                {{ s.items.length }} items
              </td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let s">
                <strong>{{ s.total | currency }}</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="payment">
              <th mat-header-cell *matHeaderCellDef>Payment</th>
              <td mat-cell *matCellDef="let s">
                <span class="payment-badge {{ s.paymentMethod }}">
                  {{ s.paymentMethod | titlecase }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let s">
                <span class="status-badge {{ s.status }}">
                  {{ s.status | titlecase }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let s">
                @if (s.status === 'completed') {
                  <button mat-icon-button color="warn"
                    (click)="refundSale(s._id)"
                    matTooltip="Refund">
                    <mat-icon>undo</mat-icon>
                  </button>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              class="sale-row"
              (click)="selectSale(row)">
            </tr>

          </table>

          @if (saleService.sales().length === 0) {
            <div class="no-data">
              <mat-icon>receipt_long</mat-icon>
              <p>No sales found</p>
            </div>
          }
        </mat-card>

        <!-- Sale Detail -->
        @if (selectedSale()) {
          <mat-card class="detail-card">
            <mat-card-header>
              <mat-card-title>
                Invoice: {{ selectedSale()?.invoiceNumber }}
              </mat-card-title>
              <button mat-icon-button (click)="selectedSale.set(null)">
                <mat-icon>close</mat-icon>
              </button>
            </mat-card-header>
            <mat-card-content>
              <div class="detail-grid">
                <div>
                  <p><strong>Date:</strong>
                    {{ selectedSale()?.createdAt | date:'medium' }}</p>
                  <p><strong>Customer:</strong>
                    {{ selectedSale()?.customer?.name || 'Walk-in' }}</p>
                  <p><strong>Cashier:</strong>
                    {{ selectedSale()?.cashier?.name }}</p>
                </div>
                <div>
                  <p><strong>Payment:</strong>
                    {{ selectedSale()?.paymentMethod | titlecase }}</p>
                  <p><strong>Amount Paid:</strong>
                    {{ selectedSale()?.amountPaid | currency }}</p>
                  <p><strong>Change:</strong>
                    {{ selectedSale()?.change | currency }}</p>
                </div>
              </div>

              <!-- Items -->
              <table mat-table [dataSource]="selectedSale()?.items || []"
                class="items-table">

                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Product</th>
                  <td mat-cell *matCellDef="let i">{{ i.name }}</td>
                </ng-container>

                <ng-container matColumnDef="qty">
                  <th mat-header-cell *matHeaderCellDef>Qty</th>
                  <td mat-cell *matCellDef="let i">{{ i.quantity }}</td>
                </ng-container>

                <ng-container matColumnDef="price">
                  <th mat-header-cell *matHeaderCellDef>Price</th>
                  <td mat-cell *matCellDef="let i">{{ i.price | currency }}</td>
                </ng-container>

                <ng-container matColumnDef="subtotal">
                  <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                  <td mat-cell *matCellDef="let i">{{ i.subtotal | currency }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="itemColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: itemColumns;"></tr>
              </table>

              <!-- Totals -->
              <div class="sale-totals">
                <p>Subtotal: {{ selectedSale()?.subtotal | currency }}</p>
                <p>Discount: {{ selectedSale()?.discount | currency }}</p>
                <p>Tax: {{ selectedSale()?.tax | currency }}</p>
                <p class="grand-total">
                  Total: {{ selectedSale()?.total | currency }}
                </p>
              </div>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .sales-container { padding: 8px; }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
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

    .sales-table { width: 100%; }

    .sale-row { cursor: pointer; }
    .sale-row:hover { background: #f5f5f5; }

    .payment-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .payment-badge.cash   { background: #e8f5e9; color: #2e7d32; }
    .payment-badge.card   { background: #e3f2fd; color: #1565c0; }
    .payment-badge.mobile { background: #f3e5f5; color: #6a1b9a; }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .status-badge.completed { background: #e8f5e9; color: #2e7d32; }
    .status-badge.refunded  { background: #fff3e0; color: #e65100; }
    .status-badge.cancelled { background: #ffebee; color: #c62828; }

    .loading { display: flex; justify-content: center; padding: 48px; }

    .no-data {
      text-align: center;
      padding: 48px;
      color: #999;
    }

    .no-data mat-icon { font-size: 48px; width: 48px; height: 48px; }

    .detail-card { margin-top: 16px; }

    .detail-card mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .detail-grid p { margin: 4px 0; }

    .items-table { width: 100%; margin-bottom: 16px; }

    .sale-totals {
      text-align: right;
      padding: 8px;
    }

    .sale-totals p { margin: 4px 0; }

    .grand-total {
      font-size: 1.2rem;
      font-weight: 700;
      color: #1a237e;
    }
  `]
})
export class SalesComponent implements OnInit {
  saleService = inject(SaleService);
  private snackBar = inject(MatSnackBar);

  // 🔷 Signals
  selectedSale = signal<Sale | null>(null);
  startDate = '';
  endDate = '';

  displayedColumns = [
    'invoice', 'date', 'customer',
    'items', 'total', 'payment', 'status', 'actions'
  ];

  itemColumns = ['name', 'qty', 'price', 'subtotal'];

  ngOnInit(): void {
    this.loadSales();
  }

  loadSales(): void {
    const params: any = {};
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;
    this.saleService.getSales(params).subscribe();
  }

  resetFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadSales();
  }

  selectSale(sale: Sale): void {
    this.selectedSale.set(sale);
  }

  refundSale(id: string): void {
    if (!confirm('Are you sure you want to refund this sale?')) return;
    this.saleService.refundSale(id).subscribe({
      next: () => {
        this.snackBar.open('✅ Sale refunded!', 'Close', { duration: 3000 });
        this.selectedSale.set(null);
      },
      error: () => {
        this.snackBar.open('❌ Refund failed!', 'Close', { duration: 3000 });
      },
    });
  }
}