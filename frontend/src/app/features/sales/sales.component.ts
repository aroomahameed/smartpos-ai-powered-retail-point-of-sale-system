import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SaleService } from '../../core/services/sale.service';
import {
  RefundMethod,
  ReturnReason,
  ReturnReceipt,
  Sale,
  SaleItem,
} from '../../core/models/sale.model';

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
    MatSelectModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule,
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

      <!-- Returns -->
      <mat-card class="return-card">
        <mat-card-header>
          <mat-icon>assignment_return</mat-icon>
          <mat-card-title>Refund and Return</mat-card-title>
          <mat-card-subtitle>Search invoice, select items, choose reason, restock, and generate a return receipt</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="return-search">
            <mat-form-field appearance="outline">
              <mat-label>Search invoice</mat-label>
              <input
                matInput
                [(ngModel)]="returnInvoiceQuery"
                placeholder="INV-00001"
                (keyup.enter)="searchReturnInvoice()"/>
            </mat-form-field>
            <button
              mat-raised-button
              color="primary"
              (click)="searchReturnInvoice()"
              [disabled]="returnLookupLoading() || !returnInvoiceQuery.trim()">
              @if (returnLookupLoading()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <mat-icon>search</mat-icon>
                Search Invoice
              }
            </button>
          </div>

          @if (returnSale()) {
            <div class="return-flow">
              <div class="return-summary">
                <div>
                  <span>Invoice</span>
                  <strong>{{ returnSale()?.invoiceNumber }}</strong>
                </div>
                <div>
                  <span>Customer</span>
                  <strong>{{ returnSale()?.customer?.name || 'Walk-in' }}</strong>
                </div>
                <div>
                  <span>Total Bill</span>
                  <strong>{{ returnSale()?.total | currency }}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{{ returnSale()?.status | titlecase }}</strong>
                </div>
              </div>

              <div class="return-items">
                @for (item of returnSale()?.items || []; track itemProductId(item)) {
                  <div class="return-item-row" [class.unavailable]="returnableQuantity(item) === 0">
                    <label class="return-check">
                      <input
                        type="checkbox"
                        [checked]="returnLine(item).selected"
                        [disabled]="returnableQuantity(item) === 0"
                        (change)="setReturnSelected(item, $event)"/>
                    </label>

                    <div class="return-product">
                      <strong>{{ item.name }}</strong>
                      <span>{{ item.sku }} - Sold: {{ item.quantity }} - Returnable: {{ returnableQuantity(item) }}</span>
                    </div>

                    <mat-form-field appearance="outline">
                      <mat-label>Qty</mat-label>
                      <input
                        matInput
                        type="number"
                        min="1"
                        [max]="returnableQuantity(item)"
                        [disabled]="!returnLine(item).selected"
                        [ngModel]="returnLine(item).quantity"
                        (ngModelChange)="setReturnQuantity(item, $event)"/>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="reason-field">
                      <mat-label>Reason</mat-label>
                      <mat-select
                        [disabled]="!returnLine(item).selected"
                        [ngModel]="returnLine(item).reason"
                        (ngModelChange)="setReturnReason(item, $event)">
                        @for (reason of returnReasons; track reason) {
                          <mat-option [value]="reason">{{ reason }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <label class="restock-toggle">
                      <input
                        type="checkbox"
                        [checked]="returnLine(item).restock"
                        [disabled]="!returnLine(item).selected"
                        (change)="setReturnRestock(item, $event)"/>
                      <span>Restock</span>
                    </label>
                  </div>
                }
              </div>

              <div class="return-actions">
                <mat-form-field appearance="outline">
                  <mat-label>Refund method</mat-label>
                  <mat-select [(ngModel)]="returnRefundMethod">
                    @for (method of refundMethods; track method.value) {
                      <mat-option [value]="method.value">{{ method.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="notes-field">
                  <mat-label>Notes</mat-label>
                  <input matInput [(ngModel)]="returnNotes" placeholder="Optional"/>
                </mat-form-field>

                <div class="return-total">
                  <span>Refund Total</span>
                  <strong>{{ selectedReturnTotal() | currency }}</strong>
                </div>

                <button
                  mat-raised-button
                  color="primary"
                  (click)="submitReturn()"
                  [disabled]="isReturning() || selectedReturnItemsCount() === 0">
                  @if (isReturning()) {
                    <mat-spinner diameter="18"></mat-spinner>
                  } @else {
                    <mat-icon>receipt</mat-icon>
                    Generate Return Receipt
                  }
                </button>
              </div>
            </div>
          }

          @if (returnReceipt()) {
            <div class="return-receipt">
              <div>
                <span>Return receipt generated</span>
                <strong>{{ returnReceipt()?.returnReceiptNumber }}</strong>
              </div>
              <div>
                <span>Refund</span>
                <strong>{{ returnReceipt()?.totalRefund | currency }}</strong>
              </div>
              <div>
                <span>Method</span>
                <strong>{{ returnReceipt()?.refundMethod | titlecase }}</strong>
              </div>
            </div>
          }
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
                @if (s.status === 'completed' || s.status === 'partially_returned') {
                  <button mat-icon-button color="warn"
                    (click)="startReturn(s); $event.stopPropagation()"
                    matTooltip="Start return">
                    <mat-icon>assignment_return</mat-icon>
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

    .return-card {
      margin-bottom: 16px;
      border: 1px solid #e7edf3;
      border-radius: 14px;
    }

    .return-card mat-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 16px 0;
    }

    .return-search {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) auto;
      gap: 12px;
      align-items: center;
      margin-top: 12px;
    }

    .return-search mat-form-field,
    .return-actions mat-form-field {
      width: 100%;
      margin-bottom: -18px;
    }

    .return-flow {
      display: grid;
      gap: 14px;
      margin-top: 16px;
    }

    .return-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
    }

    .return-summary div,
    .return-total,
    .return-receipt div {
      display: grid;
      gap: 3px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #f7f9fb;
      border: 1px solid #edf1f5;
    }

    .return-summary span,
    .return-total span,
    .return-receipt span {
      color: #6f7f91;
      font-size: 0.76rem;
      font-weight: 700;
    }

    .return-summary strong,
    .return-total strong,
    .return-receipt strong {
      color: #172033;
      font-size: 0.92rem;
    }

    .return-items {
      display: grid;
      gap: 8px;
    }

    .return-item-row {
      display: grid;
      grid-template-columns: 32px minmax(180px, 1fr) 96px minmax(180px, 220px) 100px;
      gap: 10px;
      align-items: center;
      padding: 10px;
      border: 1px solid #edf1f5;
      border-radius: 12px;
      background: #ffffff;
    }

    .return-item-row.unavailable {
      opacity: 0.58;
      background: #fafafa;
    }

    .return-check,
    .restock-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #526173;
    }

    .return-check input,
    .restock-toggle input {
      width: 18px;
      height: 18px;
    }

    .return-product {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .return-product strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .return-product span {
      color: #758294;
      font-size: 0.8rem;
    }

    .return-item-row mat-form-field {
      width: 100%;
      margin-bottom: -18px;
    }

    .return-actions {
      display: grid;
      grid-template-columns: 180px minmax(160px, 1fr) 150px auto;
      gap: 12px;
      align-items: center;
    }

    .return-receipt {
      display: grid;
      grid-template-columns: repeat(3, minmax(140px, 1fr));
      gap: 10px;
      margin-top: 16px;
    }

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
    .payment-badge.split  { background: #e0f7fa; color: #006064; }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .status-badge.completed { background: #e8f5e9; color: #2e7d32; }
    .status-badge.refunded  { background: #fff3e0; color: #e65100; }
    .status-badge.cancelled { background: #ffebee; color: #c62828; }
    .status-badge.returned { background: #e0f7fa; color: #006064; }
    .status-badge.partially_returned { background: #fff4df; color: #975f00; }

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

    @media (max-width: 980px) {
      .return-summary,
      .return-receipt {
        grid-template-columns: repeat(2, minmax(140px, 1fr));
      }

      .return-item-row,
      .return-actions {
        grid-template-columns: 1fr;
      }

      .return-search {
        grid-template-columns: 1fr;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SalesComponent implements OnInit {
  saleService = inject(SaleService);
  private snackBar = inject(MatSnackBar);

  // 🔷 Signals
  selectedSale = signal<Sale | null>(null);
  returnSale = signal<Sale | null>(null);
  returnReceipt = signal<ReturnReceipt | null>(null);
  returnLookupLoading = signal<boolean>(false);
  isReturning = signal<boolean>(false);
  returnedQuantities = signal<Record<string, number>>({});
  startDate = '';
  endDate = '';
  returnInvoiceQuery = '';
  returnRefundMethod: RefundMethod = 'original';
  returnNotes = '';
  returnLines: Record<string, {
    selected: boolean;
    quantity: number;
    reason: ReturnReason;
    restock: boolean;
  }> = {};

  returnReasons: ReturnReason[] = [
    'Damaged',
    'Wrong item',
    'Customer changed mind',
    'Expired product',
    'Other',
  ];

  refundMethods: { value: RefundMethod; label: string }[] = [
    { value: 'original', label: 'Original payment' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'mobile', label: 'Easypaisa/JazzCash' },
  ];

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

  startReturn(sale: Sale): void {
    this.returnInvoiceQuery = sale.invoiceNumber;
    this.searchReturnInvoice();
  }

  searchReturnInvoice(): void {
    const invoiceNumber = this.returnInvoiceQuery.trim();
    if (!invoiceNumber) return;

    this.returnLookupLoading.set(true);
    this.returnReceipt.set(null);

    this.saleService.searchReturnInvoice(invoiceNumber).subscribe({
      next: (res) => {
        this.returnLookupLoading.set(false);
        this.returnSale.set(res.sale);
        this.returnedQuantities.set(res.returnedQuantities || {});
        this.initializeReturnLines(res.sale);
      },
      error: (err) => {
        this.returnLookupLoading.set(false);
        this.returnSale.set(null);
        this.returnLines = {};
        this.snackBar.open(
          err.error?.message || 'Invoice not found.',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }

  initializeReturnLines(sale: Sale): void {
    this.returnLines = {};

    for (const item of sale.items) {
      const productId = this.itemProductId(item);
      this.returnLines[productId] = {
        selected: false,
        quantity: this.returnableQuantity(item) > 0 ? 1 : 0,
        reason: 'Customer changed mind',
        restock: true,
      };
    }
  }

  itemProductId(item: SaleItem): string {
    return String(item.product || item.productId || '');
  }

  returnLine(item: SaleItem): {
    selected: boolean;
    quantity: number;
    reason: ReturnReason;
    restock: boolean;
  } {
    const productId = this.itemProductId(item);

    if (!this.returnLines[productId]) {
      this.returnLines[productId] = {
        selected: false,
        quantity: this.returnableQuantity(item) > 0 ? 1 : 0,
        reason: 'Customer changed mind',
        restock: true,
      };
    }

    return this.returnLines[productId];
  }

  returnableQuantity(item: SaleItem): number {
    const productId = this.itemProductId(item);
    return Math.max(item.quantity - (this.returnedQuantities()[productId] || 0), 0);
  }

  setReturnSelected(item: SaleItem, event: Event): void {
    const line = this.returnLine(item);
    line.selected = (event.target as HTMLInputElement).checked;
    if (line.selected && line.quantity <= 0) {
      line.quantity = this.returnableQuantity(item) > 0 ? 1 : 0;
    }
  }

  setReturnQuantity(item: SaleItem, quantity: number): void {
    const line = this.returnLine(item);
    const max = this.returnableQuantity(item);
    const next = Number(quantity || 0);
    line.quantity = Math.min(Math.max(next, 1), max);
  }

  setReturnReason(item: SaleItem, reason: ReturnReason): void {
    this.returnLine(item).reason = reason;
  }

  setReturnRestock(item: SaleItem, event: Event): void {
    this.returnLine(item).restock = (event.target as HTMLInputElement).checked;
  }

  selectedReturnItemsCount(): number {
    const sale = this.returnSale();
    if (!sale) return 0;

    return sale.items.filter((item) => {
      const line = this.returnLine(item);
      return line.selected && line.quantity > 0;
    }).length;
  }

  selectedReturnTotal(): number {
    const sale = this.returnSale();
    if (!sale) return 0;

    return sale.items.reduce((sum, item) => {
      const line = this.returnLine(item);
      return line.selected ? sum + item.price * line.quantity : sum;
    }, 0);
  }

  submitReturn(): void {
    const sale = this.returnSale();
    if (!sale) return;

    const items = sale.items
      .filter((item) => this.returnLine(item).selected)
      .map((item) => {
        const line = this.returnLine(item);
        return {
          productId: this.itemProductId(item),
          quantity: line.quantity,
          reason: line.reason,
          restock: line.restock,
        };
      });

    if (items.length === 0) return;

    this.isReturning.set(true);
    this.saleService.createReturn({
      invoiceNumber: sale.invoiceNumber,
      refundMethod: this.returnRefundMethod,
      notes: this.returnNotes,
      items,
    }).subscribe({
      next: (res) => {
        this.isReturning.set(false);
        this.returnReceipt.set(res.returnReceipt);
        this.returnSale.set(res.sale);
        this.returnedQuantities.set(res.returnedQuantities || {});
        this.initializeReturnLines(res.sale);
        this.loadSales();
        this.snackBar.open(
          `Return receipt ${res.returnReceipt.returnReceiptNumber} generated.`,
          'Close',
          { duration: 4000 }
        );
      },
      error: (err) => {
        this.isReturning.set(false);
        this.snackBar.open(
          err.error?.message || 'Return failed.',
          'Close',
          { duration: 3500 }
        );
      },
    });
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
