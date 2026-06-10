import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ProductService } from '../../core/services/product.service';
import { SupplierService } from '../../core/services/supplier.service';
import {
  PurchaseOrder,
  PurchaseOrderPayloadItem,
  Supplier,
  SupplierPaymentStatus,
  SupplierProfileResponse,
} from '../../core/models/supplier.model';

interface PurchaseDraftItem {
  productId: string;
  quantity: number;
  cost: number;
  batchNumber: string;
  expiryDate: string;
}

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  template: `
    <div class="suppliers-shell">
      <section class="suppliers-hero">
        <div>
          <p class="eyebrow">Supplier and purchase management</p>
          <h1>
            <mat-icon>local_shipping</mat-icon>
            Suppliers
          </h1>
        </div>
        <button mat-flat-button color="primary" (click)="openSupplierForm()">
          <mat-icon>add_business</mat-icon>
          Add Supplier
        </button>
      </section>

      <section class="summary-grid">
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>business</mat-icon>
            <div>
              <span>Total Suppliers</span>
              <strong>{{ supplierService.suppliers().length }}</strong>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>shopping_cart_checkout</mat-icon>
            <div>
              <span>Purchase Orders</span>
              <strong>{{ supplierService.purchaseOrders().length }}</strong>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>request_quote</mat-icon>
            <div>
              <span>Due Amount</span>
              <strong>{{ totalDueAmount() | currency }}</strong>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>payments</mat-icon>
            <div>
              <span>Total Purchases</span>
              <strong>{{ totalPurchases() | currency }}</strong>
            </div>
          </mat-card-content>
        </mat-card>
      </section>

      @if (selectedProfile()) {
        <mat-card class="profile-card">
          <mat-card-header>
            <mat-icon>badge</mat-icon>
            <div>
              <mat-card-title>{{ selectedProfile()?.supplier?.name }}</mat-card-title>
              <mat-card-subtitle>{{ selectedProfile()?.supplier?.phone }}</mat-card-subtitle>
            </div>
            <button mat-icon-button (click)="selectedProfile.set(null)">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="profile-metrics">
              <div>
                <span>Supplier products</span>
                <strong>{{ selectedProfile()?.summary?.productsCount || 0 }}</strong>
              </div>
              <div>
                <span>Total purchases</span>
                <strong>{{ (selectedProfile()?.summary?.totalPurchases || 0) | currency }}</strong>
              </div>
              <div>
                <span>Due amount</span>
                <strong>{{ (selectedProfile()?.summary?.dueAmount || 0) | currency }}</strong>
              </div>
              <div>
                <span>Last purchase</span>
                <strong>{{ selectedProfile()?.summary?.lastPurchaseDate ? (selectedProfile()?.summary?.lastPurchaseDate | date:'mediumDate') : 'No purchase' }}</strong>
              </div>
            </div>

            <div class="profile-columns">
              <section>
                <h3>Supplier Products</h3>
                @if (selectedProfile()?.supplier?.products?.length) {
                  <div class="mini-list">
                    @for (product of selectedProfile()?.supplier?.products || []; track product.sku) {
                      <div>
                        <span>{{ product.name }} - {{ product.sku }}</span>
                        <strong>{{ product.lastCost | currency }}</strong>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="muted">No products linked yet</p>
                }
              </section>

              <section>
                <h3>Purchase History</h3>
                @if (selectedProfile()?.purchaseHistory?.length) {
                  <div class="mini-list">
                    @for (order of selectedProfile()?.purchaseHistory || []; track order._id) {
                      <div>
                        <span>{{ order.orderNumber }} - {{ order.paymentStatus | titlecase }}</span>
                        <strong>{{ order.subtotal | currency }}</strong>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="muted">No purchase history yet</p>
                }
              </section>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <section class="workspace-grid">
        <mat-card class="form-card">
          <mat-card-header>
            <mat-icon>assignment_add</mat-icon>
            <div>
              <mat-card-title>Create Purchase Order</mat-card-title>
              <mat-card-subtitle>Select supplier, add products, invoice, and payment status</mat-card-subtitle>
            </div>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="purchaseOrderForm" (ngSubmit)="createPurchaseOrder()">
              <div class="po-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Supplier</mat-label>
                  <mat-select formControlName="supplierId">
                    @for (supplier of supplierService.suppliers(); track supplier._id) {
                      <mat-option [value]="supplier._id">{{ supplier.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Invoice Number</mat-label>
                  <input matInput formControlName="invoiceNumber"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Invoice Date</mat-label>
                  <input matInput type="date" formControlName="invoiceDate"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Paid Amount</mat-label>
                  <input matInput type="number" formControlName="paidAmount"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Due Date</mat-label>
                  <input matInput type="date" formControlName="dueDate"/>
                </mat-form-field>

                <mat-form-field appearance="outline" class="notes-field">
                  <mat-label>Notes</mat-label>
                  <input matInput formControlName="notes"/>
                </mat-form-field>
              </div>

              <div class="draft-items">
                <div class="draft-header">
                  <h3>Products</h3>
                  <button mat-stroked-button type="button" (click)="addDraftItem()">
                    <mat-icon>add</mat-icon>
                    Add Product
                  </button>
                </div>

                @for (item of draftItems(); track $index) {
                  <div class="draft-item">
                    <mat-form-field appearance="outline">
                      <mat-label>Product</mat-label>
                      <mat-select
                        [ngModel]="item.productId"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setDraftProduct($index, $event)">
                        @for (product of productService.products(); track product._id) {
                          <mat-option [value]="product._id">{{ product.name }} - {{ product.sku }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Qty</mat-label>
                      <input
                        matInput
                        type="number"
                        min="1"
                        [ngModel]="item.quantity"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setDraftValue($index, 'quantity', $event)"/>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Cost</mat-label>
                      <input
                        matInput
                        type="number"
                        min="0"
                        [ngModel]="item.cost"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setDraftValue($index, 'cost', $event)"/>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Batch</mat-label>
                      <input
                        matInput
                        [ngModel]="item.batchNumber"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setDraftValue($index, 'batchNumber', $event)"/>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Expiry</mat-label>
                      <input
                        matInput
                        type="date"
                        [ngModel]="item.expiryDate"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setDraftValue($index, 'expiryDate', $event)"/>
                    </mat-form-field>

                    <button mat-icon-button color="warn" type="button" (click)="removeDraftItem($index)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <div class="po-total">
                <span>Purchase Total</span>
                <strong>{{ purchaseOrderTotal() | currency }}</strong>
                <span>Due {{ purchaseOrderDue() | currency }}</span>
                <mat-chip class="status {{ draftPaymentStatus() }}">{{ draftPaymentStatus() | titlecase }}</mat-chip>
              </div>

              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="resetPurchaseOrder()">Reset</button>
                <button mat-flat-button color="primary" type="submit"
                  [disabled]="purchaseOrderForm.invalid || draftItems().length === 0 || isOrderSaving()">
                  @if (isOrderSaving()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Create Purchase Order
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card class="supplier-form-card">
          <mat-card-header>
            <mat-icon>storefront</mat-icon>
            <div>
              <mat-card-title>{{ editingSupplier() ? 'Edit Supplier' : 'Supplier Profile' }}</mat-card-title>
              <mat-card-subtitle>Name, contact, address, and due balance</mat-card-subtitle>
            </div>
          </mat-card-header>
          <mat-card-content>
            @if (showSupplierForm()) {
              <form [formGroup]="supplierForm" (ngSubmit)="saveSupplier()">
                <div class="supplier-form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Supplier Name</mat-label>
                    <input matInput formControlName="name"/>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Contact Person</mat-label>
                    <input matInput formControlName="contactPerson"/>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Phone</mat-label>
                    <input matInput formControlName="phone"/>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" formControlName="email"/>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Due Amount</mat-label>
                    <input matInput type="number" formControlName="dueAmount"/>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Address</mat-label>
                    <input matInput formControlName="address"/>
                  </mat-form-field>
                </div>

                <div class="form-actions">
                  <button mat-stroked-button type="button" (click)="closeSupplierForm()">Cancel</button>
                  <button mat-flat-button color="primary" type="submit"
                    [disabled]="supplierForm.invalid || isSupplierSaving()">
                    Save Supplier
                  </button>
                </div>
              </form>
            } @else {
              <div class="empty-panel">
                <mat-icon>storefront</mat-icon>
                <p>Create or edit a supplier profile.</p>
                <button mat-stroked-button (click)="openSupplierForm()">Add Supplier</button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </section>

      <section class="tables-grid">
        <mat-card class="table-card">
          <mat-card-header>
            <mat-card-title>Suppliers</mat-card-title>
            <mat-card-subtitle>{{ filteredSuppliers().length }} active suppliers</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search suppliers</mat-label>
              <input
                matInput
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                placeholder="Search name, phone, contact..."/>
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            @if (supplierService.isLoading()) {
              <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
            } @else if (filteredSuppliers().length) {
              <div class="supplier-list">
                @for (supplier of filteredSuppliers(); track supplier._id) {
                  <div class="supplier-row">
                    <div>
                      <strong>{{ supplier.name }}</strong>
                      <span>{{ supplier.contactPerson || 'No contact' }} - {{ supplier.phone }}</span>
                      <span>Due {{ (supplier.dueAmount || 0) | currency }}</span>
                    </div>
                    <div>
                      <button mat-icon-button color="primary" (click)="viewSupplierProfile(supplier)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button mat-icon-button color="primary" (click)="editSupplier(supplier)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="deleteSupplier(supplier._id)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-panel">
                <mat-icon>business</mat-icon>
                <p>No suppliers found</p>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="table-card">
          <mat-card-header>
            <mat-card-title>Purchase Orders</mat-card-title>
            <mat-card-subtitle>Receive stock and mark payment status</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (supplierService.purchaseOrders().length) {
              <div class="po-list">
                @for (order of supplierService.purchaseOrders(); track order._id) {
                  <div class="po-row">
                    <div>
                      <strong>{{ order.orderNumber }} - {{ order.supplierName }}</strong>
                      <span>Invoice: {{ order.invoiceNumber || '-' }} - {{ order.items.length }} products</span>
                      <span>Total {{ order.subtotal | currency }} - Due {{ order.dueAmount | currency }}</span>
                    </div>
                    <div class="po-status">
                      <mat-chip class="status {{ order.paymentStatus }}">{{ order.paymentStatus | titlecase }}</mat-chip>
                      <mat-chip>{{ order.status | titlecase }}</mat-chip>
                    </div>
                    <div class="po-actions">
                      <button
                        mat-stroked-button
                        color="primary"
                        (click)="receiveOrder(order)"
                        [disabled]="order.status === 'received'">
                        Receive Stock
                      </button>
                      <button mat-stroked-button (click)="markPaid(order, 'paid')">Paid</button>
                      <button mat-stroked-button (click)="markPaid(order, 'partial')">Partial</button>
                      <button mat-stroked-button (click)="markPaid(order, 'unpaid')">Unpaid</button>
                      <button mat-stroked-button color="warn" (click)="markPaid(order, 'overdue')">Overdue</button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-panel">
                <mat-icon>assignment</mat-icon>
                <p>No purchase orders yet</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </section>
    </div>
  `,
  styles: [`
    .suppliers-shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: #172033;
    }

    .suppliers-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px;
      border: 1px solid #e7edf3;
      border-radius: 16px;
      background: white;
      box-shadow: 0 12px 30px rgba(25, 45, 70, 0.08);
    }

    .eyebrow {
      margin: 0 0 5px;
      color: #718093;
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

    .summary-grid,
    .workspace-grid,
    .tables-grid,
    .profile-metrics,
    .profile-columns,
    .po-grid,
    .supplier-form-grid {
      display: grid;
      gap: 12px;
    }

    .summary-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .workspace-grid {
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
      align-items: start;
    }

    .tables-grid,
    .profile-columns {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }

    .summary-card,
    .profile-card,
    .form-card,
    .supplier-form-card,
    .table-card {
      border: 1px solid #e7edf3;
      border-radius: 12px !important;
      box-shadow: 0 10px 24px rgba(25, 45, 70, 0.07) !important;
    }

    .summary-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px !important;
    }

    .summary-card mat-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #eef7f4;
      color: #16665c;
      font-size: 26px;
    }

    .summary-card span,
    .summary-card small,
    .muted,
    .supplier-row span,
    .po-row span {
      color: #718093;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .summary-card strong {
      display: block;
      margin-top: 2px;
      font-size: 1.32rem;
      font-weight: 900;
    }

    mat-card-header {
      align-items: center;
      gap: 10px;
      padding-bottom: 8px;
    }

    mat-card-header > button {
      margin-left: auto;
    }

    .profile-metrics {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 16px;
    }

    .profile-metrics div,
    .mini-list div,
    .supplier-row,
    .po-row {
      border: 1px solid #edf1f5;
      border-radius: 10px;
      background: #fbfcfe;
    }

    .profile-metrics div {
      display: grid;
      gap: 4px;
      padding: 12px;
    }

    .profile-metrics span {
      color: #718093;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .profile-metrics strong {
      font-size: 0.95rem;
      font-weight: 900;
    }

    .mini-list,
    .supplier-list,
    .po-list {
      display: grid;
      gap: 8px;
      max-height: 430px;
      overflow-y: auto;
    }

    .mini-list div,
    .supplier-row,
    .po-row {
      display: grid;
      gap: 8px;
      padding: 10px;
    }

    .mini-list div {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }

    .supplier-row {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }

    .supplier-row > div:first-child,
    .po-row > div:first-child {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .po-grid,
    .supplier-form-grid {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-top: 10px;
    }

    .notes-field {
      grid-column: span 2;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: -18px;
    }

    .draft-items {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }

    .draft-header,
    .form-actions,
    .po-total {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .draft-header h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 900;
    }

    .draft-item {
      display: grid;
      grid-template-columns: 1.2fr 0.55fr 0.65fr 0.8fr 0.8fr auto;
      gap: 8px;
      align-items: center;
      padding: 10px;
      border: 1px solid #edf1f5;
      border-radius: 10px;
      background: #fbfcfe;
    }

    .po-total {
      margin-top: 12px;
      padding: 11px 12px;
      border-radius: 10px;
      background: #122632;
      color: white;
      font-weight: 900;
    }

    .po-total span {
      color: rgba(255,255,255,0.72);
    }

    .po-total mat-chip {
      background: rgba(255,255,255,0.14) !important;
      color: white !important;
    }

    .form-actions {
      justify-content: flex-end;
      margin-top: 14px;
    }

    .search-field {
      width: 100%;
    }

    .po-status {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .po-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    mat-chip {
      min-height: 28px;
      border-radius: 999px;
      background: #e8f6f1 !important;
      color: #165a51 !important;
      font-weight: 800;
    }

    mat-chip.partial,
    mat-chip.unpaid {
      background: #fff4df !important;
      color: #975f00 !important;
    }

    mat-chip.overdue {
      background: #fff0f0 !important;
      color: #a7282e !important;
    }

    .empty-panel,
    .loading {
      display: grid;
      place-items: center;
      gap: 8px;
      min-height: 170px;
      color: #8290a1;
      text-align: center;
    }

    @media (max-width: 1180px) {
      .summary-grid,
      .workspace-grid,
      .tables-grid,
      .profile-metrics,
      .profile-columns {
        grid-template-columns: 1fr 1fr;
      }

      .draft-item {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 760px) {
      .suppliers-hero,
      .form-actions,
      .draft-header {
        align-items: stretch;
        flex-direction: column;
      }

      .summary-grid,
      .workspace-grid,
      .tables-grid,
      .profile-metrics,
      .profile-columns,
      .draft-item {
        grid-template-columns: 1fr;
      }

      .notes-field {
        grid-column: span 1;
      }
    }
  `],
})
export class SuppliersComponent implements OnInit {
  supplierService = inject(SupplierService);
  productService = inject(ProductService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  showSupplierForm = signal<boolean>(false);
  editingSupplier = signal<Supplier | null>(null);
  selectedProfile = signal<SupplierProfileResponse | null>(null);
  draftItems = signal<PurchaseDraftItem[]>([]);
  isSupplierSaving = signal<boolean>(false);
  isOrderSaving = signal<boolean>(false);
  searchQuery = signal<string>('');

  supplierForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    contactPerson: [''],
    phone: ['', Validators.required],
    email: [''],
    address: [''],
    dueAmount: [0, Validators.min(0)],
  });

  purchaseOrderForm: FormGroup = this.fb.group({
    supplierId: ['', Validators.required],
    invoiceNumber: [''],
    invoiceDate: [''],
    paidAmount: [0, Validators.min(0)],
    dueDate: [''],
    notes: [''],
  });

  filteredSuppliers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.supplierService.suppliers();

    return this.supplierService.suppliers().filter((supplier) =>
      [
        supplier.name,
        supplier.contactPerson || '',
        supplier.phone,
        supplier.email || '',
      ].some((value) => value.toLowerCase().includes(query))
    );
  });

  totalDueAmount = computed(() =>
    this.supplierService.suppliers().reduce((sum, supplier) =>
      sum + Number(supplier.dueAmount || 0), 0
    )
  );

  totalPurchases = computed(() =>
    this.supplierService.suppliers().reduce((sum, supplier) =>
      sum + Number(supplier.totalPurchases || 0), 0
    )
  );

  ngOnInit(): void {
    this.loadData();
    this.addDraftItem();
  }

  loadData(): void {
    this.supplierService.getSuppliers().subscribe();
    this.supplierService.getPurchaseOrders().subscribe();
    this.productService.getProducts().subscribe();
  }

  openSupplierForm(): void {
    this.showSupplierForm.set(true);
    this.editingSupplier.set(null);
    this.supplierForm.reset({ dueAmount: 0 });
  }

  closeSupplierForm(): void {
    this.showSupplierForm.set(false);
    this.editingSupplier.set(null);
    this.supplierForm.reset();
  }

  editSupplier(supplier: Supplier): void {
    this.editingSupplier.set(supplier);
    this.showSupplierForm.set(true);
    this.supplierForm.patchValue({
      ...supplier,
      dueAmount: supplier.dueAmount || 0,
    });
  }

  saveSupplier(): void {
    if (this.supplierForm.invalid) return;

    this.isSupplierSaving.set(true);
    const editing = this.editingSupplier();
    const request$ = editing
      ? this.supplierService.updateSupplier(editing._id, this.supplierForm.value)
      : this.supplierService.createSupplier(this.supplierForm.value);

    request$.subscribe({
      next: () => {
        this.isSupplierSaving.set(false);
        this.snackBar.open(`Supplier ${editing ? 'updated' : 'created'}.`, 'Close', {
          duration: 3000,
        });
        this.closeSupplierForm();
        this.supplierService.getSuppliers().subscribe();
      },
      error: (err) => {
        this.isSupplierSaving.set(false);
        this.snackBar.open(err.error?.message || 'Supplier save failed.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  viewSupplierProfile(supplier: Supplier): void {
    this.supplierService.getSupplierProfile(supplier._id).subscribe({
      next: (profile) => this.selectedProfile.set(profile),
      error: () => this.snackBar.open('Supplier profile failed to load.', 'Close', {
        duration: 3000,
      }),
    });
  }

  deleteSupplier(id: string): void {
    if (!confirm('Delete this supplier?')) return;

    this.supplierService.deleteSupplier(id).subscribe({
      next: () => this.snackBar.open('Supplier deleted.', 'Close', { duration: 2500 }),
      error: () => this.snackBar.open('Supplier delete failed.', 'Close', { duration: 2500 }),
    });
  }

  addDraftItem(): void {
    this.draftItems.update((items) => [
      ...items,
      { productId: '', quantity: 1, cost: 0, batchNumber: '', expiryDate: '' },
    ]);
  }

  removeDraftItem(index: number): void {
    this.draftItems.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  setDraftProduct(index: number, productId: string): void {
    const product = this.productService.products().find((item) => item._id === productId);
    this.draftItems.update((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, productId, cost: product?.cost || item.cost || 0 }
          : item
      )
    );
  }

  setDraftValue(index: number, key: keyof PurchaseDraftItem, value: any): void {
    this.draftItems.update((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  }

  purchaseOrderTotal(): number {
    return this.draftItems().reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0),
      0
    );
  }

  purchaseOrderDue(): number {
    return Math.max(this.purchaseOrderTotal() - Number(this.purchaseOrderForm.value.paidAmount || 0), 0);
  }

  draftPaymentStatus(): SupplierPaymentStatus {
    const total = this.purchaseOrderTotal();
    const paid = Number(this.purchaseOrderForm.value.paidAmount || 0);
    const dueDate = this.purchaseOrderForm.value.dueDate;

    if (total > 0 && paid >= total) return 'paid';
    if (dueDate && new Date(dueDate).getTime() < Date.now()) return 'overdue';
    if (paid > 0) return 'partial';
    return 'unpaid';
  }

  createPurchaseOrder(): void {
    if (this.purchaseOrderForm.invalid) return;

    const items: PurchaseOrderPayloadItem[] = this.draftItems()
      .filter((item) => item.productId && Number(item.quantity || 0) > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity || 0),
        cost: Number(item.cost || 0),
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate || undefined,
      }));

    if (items.length === 0) {
      this.snackBar.open('Add at least one product to the purchase order.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isOrderSaving.set(true);
    this.supplierService.createPurchaseOrder({
      supplierId: this.purchaseOrderForm.value.supplierId,
      invoiceNumber: this.purchaseOrderForm.value.invoiceNumber,
      invoiceDate: this.purchaseOrderForm.value.invoiceDate || undefined,
      dueDate: this.purchaseOrderForm.value.dueDate || undefined,
      paidAmount: Number(this.purchaseOrderForm.value.paidAmount || 0),
      notes: this.purchaseOrderForm.value.notes,
      items,
    }).subscribe({
      next: (res) => {
        this.isOrderSaving.set(false);
        this.snackBar.open(`Purchase order ${res.purchaseOrder?.orderNumber} created.`, 'Close', {
          duration: 3200,
        });
        this.resetPurchaseOrder();
        this.supplierService.getSuppliers().subscribe();
      },
      error: (err) => {
        this.isOrderSaving.set(false);
        this.snackBar.open(err.error?.message || 'Purchase order failed.', 'Close', {
          duration: 3200,
        });
      },
    });
  }

  resetPurchaseOrder(): void {
    this.purchaseOrderForm.reset({ paidAmount: 0 });
    this.draftItems.set([]);
    this.addDraftItem();
  }

  receiveOrder(order: PurchaseOrder): void {
    this.supplierService.receivePurchaseOrder(order._id).subscribe({
      next: () => {
        this.snackBar.open('Stock received and inventory updated.', 'Close', {
          duration: 3200,
        });
        this.productService.getProducts().subscribe();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Receive failed.', 'Close', {
        duration: 3200,
      }),
    });
  }

  markPaid(order: PurchaseOrder, status: SupplierPaymentStatus): void {
    const paidAmount = status === 'paid'
      ? order.subtotal
      : status === 'unpaid' || status === 'overdue'
        ? order.paidAmount
        : Math.max(order.paidAmount, order.subtotal / 2);

    this.supplierService.updatePaymentStatus(order._id, paidAmount, status).subscribe({
      next: () => {
        this.snackBar.open(`Payment status marked ${status}.`, 'Close', {
          duration: 2500,
        });
        this.supplierService.getSuppliers().subscribe();
      },
      error: () => this.snackBar.open('Payment update failed.', 'Close', {
        duration: 2500,
      }),
    });
  }
}
