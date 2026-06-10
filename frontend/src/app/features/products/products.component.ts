import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ProductService } from '../../core/services/product.service';
import {
  InventoryDashboard,
  InventoryMovement,
  InventoryMovementType,
  Product,
} from '../../core/models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  template: `
    <div class="inventory-shell">
      <section class="inventory-hero">
        <div>
          <p class="eyebrow">Inventory control</p>
          <h1>
            <mat-icon>inventory_2</mat-icon>
            Inventory
          </h1>
        </div>
        <div class="hero-actions">
          <button mat-stroked-button (click)="loadInventoryData()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button mat-flat-button color="primary" (click)="openForm()">
            <mat-icon>add</mat-icon>
            Add Product
          </button>
        </div>
      </section>

      <section class="dashboard-grid">
        <mat-card class="metric-card warning">
          <mat-card-content>
            <mat-icon>warning</mat-icon>
            <div>
              <span>Low Stock Items</span>
              <strong>{{ lowStockProducts().length }}</strong>
              <small>Suggested action: Reorder</small>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card danger">
          <mat-card-content>
            <mat-icon>event_busy</mat-icon>
            <div>
              <span>Expiring Soon</span>
              <strong>{{ expiringSoonProducts().length }}</strong>
              <small>Next 30 days</small>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card success">
          <mat-card-content>
            <mat-icon>check_circle</mat-icon>
            <div>
              <span>Healthy Stock</span>
              <strong>{{ inventoryDashboard()?.healthyStock || healthyStockCount() }}</strong>
              <small>Above reorder level</small>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card neutral">
          <mat-card-content>
            <mat-icon>category</mat-icon>
            <div>
              <span>Total Products</span>
              <strong>{{ productService.products().length }}</strong>
              <small>Active inventory SKUs</small>
            </div>
          </mat-card-content>
        </mat-card>
      </section>

      @if (lowStockProducts().length || expiringSoonProducts().length) {
        <section class="alert-grid">
          @for (product of lowStockProducts().slice(0, 4); track product._id) {
            <mat-card class="alert-card">
              <mat-card-content>
                <div>
                  <strong>{{ product.name }}</strong>
                  <span>Current Stock: {{ product.stock }}</span>
                  <span>Minimum Stock: {{ reorderPoint(product) }}</span>
                </div>
                <mat-chip>{{ inventoryStatus(product) }}</mat-chip>
                <small>Suggested Action: Reorder</small>
              </mat-card-content>
            </mat-card>
          }

          @for (product of expiringSoonProducts().slice(0, 4); track product._id) {
            <mat-card class="alert-card expiry">
              <mat-card-content>
                <div>
                  <strong>{{ product.name }}</strong>
                  <span>Batch: {{ product.batchNumber || '-' }}</span>
                  <span>Expiry: {{ product.expiryDate | date:'mediumDate' }}</span>
                </div>
                <mat-chip>{{ expiryStatus(product) }}</mat-chip>
                <small>Suggested Action: Review batch</small>
              </mat-card-content>
            </mat-card>
          }
        </section>
      }

      <section class="workspace-grid">
        <mat-card class="inventory-action-card">
          <mat-card-header>
            <mat-icon>sync_alt</mat-icon>
            <div>
              <mat-card-title>Inventory Action</mat-card-title>
              <mat-card-subtitle>Stock in, stock out, adjustment, transfer, damage/loss, or supplier purchase</mat-card-subtitle>
            </div>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="inventoryForm" (ngSubmit)="submitInventoryAction()">
              <div class="inventory-form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Product</mat-label>
                  <mat-select formControlName="productId">
                    @for (product of productService.products(); track product._id) {
                      <mat-option [value]="product._id">
                        {{ product.name }} - {{ product.sku }} - Stock {{ product.stock }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Action</mat-label>
                  <mat-select formControlName="type">
                    @for (action of movementTypes; track action.value) {
                      <mat-option [value]="action.value">{{ action.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                @if (inventoryForm.value.type === 'adjustment') {
                  <mat-form-field appearance="outline">
                    <mat-label>Counted Stock</mat-label>
                    <input matInput type="number" min="0" formControlName="adjustmentStock"/>
                  </mat-form-field>
                } @else {
                  <mat-form-field appearance="outline">
                    <mat-label>Quantity</mat-label>
                    <input matInput type="number" min="1" formControlName="quantity"/>
                  </mat-form-field>
                }

                <mat-form-field appearance="outline">
                  <mat-label>Supplier</mat-label>
                  <input matInput formControlName="supplier" placeholder="Supplier purchase"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Batch Number</mat-label>
                  <input matInput formControlName="batchNumber" placeholder="B-2026-07"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Expiry Date</mat-label>
                  <input matInput type="date" formControlName="expiryDate"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>From Location</mat-label>
                  <input matInput formControlName="fromLocation" placeholder="Store room"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>To Location</mat-label>
                  <input matInput formControlName="toLocation" placeholder="Shelf A"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Reference</mat-label>
                  <input matInput formControlName="referenceNumber" placeholder="PO / transfer no."/>
                </mat-form-field>

                <mat-form-field appearance="outline" class="reason-field">
                  <mat-label>Reason / Notes</mat-label>
                  <input matInput formControlName="reason" placeholder="Damaged, expired, purchase invoice..."/>
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="resetInventoryForm()">
                  <mat-icon>restart_alt</mat-icon>
                  Reset
                </button>
                <button mat-flat-button color="primary" type="submit"
                  [disabled]="inventoryForm.invalid || isInventorySaving()">
                  @if (isInventorySaving()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>save</mat-icon>
                    Save Inventory Action
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card class="history-card">
          <mat-card-header>
            <mat-icon>history</mat-icon>
            <div>
              <mat-card-title>Inventory History</mat-card-title>
              <mat-card-subtitle>{{ inventoryMovements().length }} latest movements</mat-card-subtitle>
            </div>
          </mat-card-header>
          <mat-card-content>
            @if (inventoryMovements().length) {
              <div class="history-list">
                @for (movement of inventoryMovements().slice(0, 8); track movement._id) {
                  <div class="history-row">
                    <div>
                      <strong>{{ movement.productName }}</strong>
                      <span>{{ movementLabel(movement.type) }} - {{ movement.previousStock }} to {{ movement.newStock }}</span>
                      <small>{{ movement.batchNumber || movement.referenceNumber || movement.reason || 'No reference' }}</small>
                    </div>
                    <mat-chip>{{ movement.quantity }}</mat-chip>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <mat-icon>history</mat-icon>
                <p>No inventory movement recorded yet</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </section>

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search products</mat-label>
        <input matInput [(ngModel)]="searchQuery" placeholder="Search by name, SKU, batch, category, supplier..."/>
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      @if (showForm()) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>{{ editingProduct() ? 'Edit Product' : 'Add New Product' }}</mat-card-title>
            <mat-card-subtitle>Batch, expiry, reorder level, supplier, and stock settings</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
              <div class="product-form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Product Name</mat-label>
                  <input matInput formControlName="name"/>
                  @if (productForm.get('name')?.hasError('required') && productForm.get('name')?.touched) {
                    <mat-error>Name is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>SKU</mat-label>
                  <input matInput formControlName="sku"/>
                  @if (productForm.get('sku')?.hasError('required') && productForm.get('sku')?.touched) {
                    <mat-error>SKU is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Price</mat-label>
                  <input matInput type="number" formControlName="price"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Cost</mat-label>
                  <input matInput type="number" formControlName="cost"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Current Stock</mat-label>
                  <input matInput type="number" formControlName="stock"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Minimum Stock</mat-label>
                  <input matInput type="number" formControlName="lowStockAlert"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Reorder Level</mat-label>
                  <input matInput type="number" formControlName="reorderLevel"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Category</mat-label>
                  <input matInput formControlName="category"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Unit</mat-label>
                  <input matInput formControlName="unit"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Barcode</mat-label>
                  <input matInput formControlName="barcode"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Supplier</mat-label>
                  <input matInput formControlName="supplier"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Location</mat-label>
                  <input matInput formControlName="location"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Batch Number</mat-label>
                  <input matInput formControlName="batchNumber"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Expiry Date</mat-label>
                  <input matInput type="date" formControlName="expiryDate"/>
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="closeForm()">Cancel</button>
                <button mat-flat-button color="primary" type="submit"
                  [disabled]="productForm.invalid || isLoading()">
                  @if (isLoading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    {{ editingProduct() ? 'Update Product' : 'Create Product' }}
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      @if (productService.isLoading()) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <mat-card class="table-card">
          <mat-card-header>
            <mat-card-title>Product Inventory</mat-card-title>
            <mat-card-subtitle>{{ filteredProducts().length }} products loaded</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (filteredProducts().length) {
              <div class="table-wrap">
                <table mat-table [dataSource]="filteredProducts()" class="products-table">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Product</th>
                    <td mat-cell *matCellDef="let p">
                      <div class="product-name-cell">
                        <strong>{{ p.name }}</strong>
                        <span>{{ p.sku }} - {{ p.category }}</span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="stock">
                    <th mat-header-cell *matHeaderCellDef>Stock</th>
                    <td mat-cell *matCellDef="let p">
                      <span class="stock-badge" [class.low]="isLowStock(p)" [class.out]="p.stock === 0">
                        {{ p.stock }} {{ p.unit }}
                      </span>
                      <small class="muted">Min {{ reorderPoint(p) }}</small>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="batch">
                    <th mat-header-cell *matHeaderCellDef>Batch</th>
                    <td mat-cell *matCellDef="let p">
                      <strong>{{ p.batchNumber || '-' }}</strong>
                      <small class="muted">{{ p.location || 'No location' }}</small>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="expiry">
                    <th mat-header-cell *matHeaderCellDef>Expiry</th>
                    <td mat-cell *matCellDef="let p">
                      <span class="expiry-pill" [class.soon]="expiryStatus(p) === 'Expiring Soon'" [class.expired]="expiryStatus(p) === 'Expired'">
                        {{ p.expiryDate ? (p.expiryDate | date:'mediumDate') : 'No expiry' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="supplier">
                    <th mat-header-cell *matHeaderCellDef>Supplier</th>
                    <td mat-cell *matCellDef="let p">{{ p.supplier || '-' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let p">
                      <mat-chip>{{ inventoryStatus(p) }}</mat-chip>
                      <small class="muted">{{ suggestedAction(p) }}</small>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="price">
                    <th mat-header-cell *matHeaderCellDef>Price</th>
                    <td mat-cell *matCellDef="let p">{{ p.price | currency }}</td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let p">
                      <button mat-icon-button color="primary" (click)="selectForInventory(p)">
                        <mat-icon>sync_alt</mat-icon>
                      </button>
                      <button mat-icon-button color="primary" (click)="editProduct(p)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="deleteProduct(p._id)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                </table>
              </div>
            } @else {
              <div class="empty-state table-empty">
                <mat-icon>inventory_2</mat-icon>
                <p>No products found</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .inventory-shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: #172033;
    }

    .inventory-hero,
    .dashboard-grid,
    .workspace-grid,
    .alert-grid {
      display: grid;
      gap: 14px;
    }

    .inventory-hero {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      padding: 18px;
      border: 1px solid #e7edf3;
      border-radius: 16px;
      background: #ffffff;
      box-shadow: 0 12px 30px rgba(25, 45, 70, 0.08);
    }

    .eyebrow {
      margin: 0 0 5px;
      color: #718093;
      font-size: 0.78rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 1.55rem;
      font-weight: 900;
      letter-spacing: 0;
    }

    .hero-actions,
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .hero-actions button,
    .form-actions button {
      border-radius: 8px;
      min-height: 40px;
    }

    .dashboard-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .metric-card,
    .alert-card,
    .inventory-action-card,
    .history-card,
    .form-card,
    .table-card {
      border: 1px solid #e7edf3;
      border-radius: 12px !important;
      box-shadow: 0 10px 24px rgba(25, 45, 70, 0.07) !important;
    }

    .metric-card mat-card-content {
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
      border-radius: 12px;
      font-size: 26px;
    }

    .metric-card span,
    .metric-card small {
      color: #6e7f91;
      font-weight: 800;
    }

    .metric-card strong {
      display: block;
      margin: 2px 0;
      font-size: 1.45rem;
      font-weight: 900;
    }

    .metric-card.warning mat-icon { background: #fff4df; color: #975f00; }
    .metric-card.danger mat-icon { background: #fff0f0; color: #a7282e; }
    .metric-card.success mat-icon { background: #e9f8ef; color: #1d773d; }
    .metric-card.neutral mat-icon { background: #eaf2ff; color: #2457a6; }

    .alert-grid {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .alert-card mat-card-content {
      display: grid;
      gap: 10px;
      padding: 14px !important;
    }

    .alert-card div,
    .history-row div,
    .product-name-cell {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .alert-card span,
    .alert-card small,
    .history-row span,
    .history-row small,
    .muted {
      color: #718093;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .workspace-grid {
      grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.7fr);
      align-items: start;
    }

    mat-card-header {
      align-items: center;
      gap: 10px;
      padding-bottom: 8px;
    }

    mat-card-header > mat-icon {
      color: #16665c;
    }

    .inventory-form-grid,
    .product-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }

    .reason-field {
      grid-column: span 2;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: -18px;
    }

    .history-list {
      display: grid;
      gap: 8px;
      max-height: 420px;
      overflow-y: auto;
    }

    .history-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 10px;
      border: 1px solid #edf1f5;
      border-radius: 10px;
      background: #fbfcfe;
    }

    .search-field {
      width: 100%;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .products-table {
      width: 100%;
      min-width: 960px;
    }

    .stock-badge,
    .expiry-pill {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #e8f6f1;
      color: #165a51;
      font-size: 0.78rem;
      font-weight: 900;
      white-space: nowrap;
    }

    .stock-badge.low,
    .expiry-pill.soon {
      background: #fff4df;
      color: #975f00;
    }

    .stock-badge.out,
    .expiry-pill.expired {
      background: #fff0f0;
      color: #a7282e;
    }

    td mat-chip {
      font-weight: 800;
    }

    .loading,
    .empty-state {
      display: grid;
      place-items: center;
      gap: 8px;
      min-height: 160px;
      color: #8290a1;
      text-align: center;
    }

    .empty-state mat-icon {
      width: 42px;
      height: 42px;
      font-size: 42px;
    }

    @media (max-width: 1180px) {
      .dashboard-grid,
      .workspace-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 760px) {
      .inventory-hero,
      .dashboard-grid,
      .workspace-grid {
        grid-template-columns: 1fr;
      }

      .hero-actions,
      .form-actions {
        justify-content: stretch;
        flex-direction: column;
      }

      .reason-field {
        grid-column: span 1;
      }
    }
  `],
})
export class ProductsComponent implements OnInit {
  productService = inject(ProductService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  showForm = signal<boolean>(false);
  editingProduct = signal<Product | null>(null);
  isLoading = signal<boolean>(false);
  isInventorySaving = signal<boolean>(false);
  inventoryDashboard = signal<InventoryDashboard | null>(null);
  inventoryMovements = signal<InventoryMovement[]>([]);
  searchQuery = '';

  displayedColumns = [
    'name',
    'stock',
    'batch',
    'expiry',
    'supplier',
    'status',
    'price',
    'actions',
  ];

  movementTypes: { value: InventoryMovementType; label: string }[] = [
    { value: 'stock_in', label: 'Stock In' },
    { value: 'stock_out', label: 'Stock Out' },
    { value: 'adjustment', label: 'Stock Adjustment' },
    { value: 'transfer', label: 'Stock Transfer' },
    { value: 'damage_loss', label: 'Damage / Loss Entry' },
    { value: 'supplier_purchase', label: 'Supplier Purchase' },
  ];

  productForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    sku: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    cost: [0, [Validators.required, Validators.min(0)]],
    stock: [0, Validators.min(0)],
    lowStockAlert: [10, Validators.min(0)],
    reorderLevel: [10, Validators.min(0)],
    category: ['', Validators.required],
    unit: ['pcs'],
    barcode: [''],
    supplier: [''],
    location: [''],
    batchNumber: [''],
    expiryDate: [''],
  });

  inventoryForm: FormGroup = this.fb.group({
    productId: ['', Validators.required],
    type: ['stock_in' as InventoryMovementType, Validators.required],
    quantity: [1, Validators.min(0)],
    adjustmentStock: [0, Validators.min(0)],
    reason: [''],
    supplier: [''],
    fromLocation: [''],
    toLocation: [''],
    batchNumber: [''],
    expiryDate: [''],
    referenceNumber: [''],
  });

  filteredProducts = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.productService.products();

    return this.productService.products().filter((product) =>
      [
        product.name,
        product.sku,
        product.category,
        product.supplier || '',
        product.batchNumber || '',
        product.location || '',
      ].some((value) => value.toLowerCase().includes(query))
    );
  });

  lowStockProducts = computed(() =>
    this.productService.products().filter((product) => this.isLowStock(product))
  );

  expiringSoonProducts = computed(() =>
    this.productService.products().filter((product) =>
      this.expiryStatus(product) === 'Expiring Soon' ||
      this.expiryStatus(product) === 'Expired'
    )
  );

  healthyStockCount = computed(() =>
    this.productService.products().filter((product) =>
      !this.isLowStock(product) && this.expiryStatus(product) === 'Healthy'
    ).length
  );

  ngOnInit(): void {
    this.loadInventoryData();
  }

  loadInventoryData(): void {
    this.productService.getProducts().subscribe();
    this.productService.getInventoryDashboard().subscribe({
      next: (dashboard) => this.inventoryDashboard.set(dashboard),
    });
    this.productService.getInventoryHistory().subscribe({
      next: (res) => this.inventoryMovements.set(res.movements || []),
    });
  }

  openForm(): void {
    this.showForm.set(true);
    this.editingProduct.set(null);
    this.productForm.reset({
      unit: 'pcs',
      lowStockAlert: 10,
      reorderLevel: 10,
      stock: 0,
      price: 0,
      cost: 0,
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingProduct.set(null);
    this.productForm.reset();
  }

  editProduct(product: Product): void {
    this.editingProduct.set(product);
    this.showForm.set(true);
    this.productForm.patchValue({
      ...product,
      expiryDate: this.toDateInput(product.expiryDate),
      reorderLevel: product.reorderLevel ?? product.lowStockAlert ?? 10,
    });
  }

  selectForInventory(product: Product): void {
    this.inventoryForm.patchValue({
      productId: product._id,
      supplier: product.supplier || '',
      fromLocation: product.location || '',
      batchNumber: product.batchNumber || '',
      expiryDate: this.toDateInput(product.expiryDate),
    });
    this.snackBar.open(`${product.name} selected for inventory action.`, 'Close', {
      duration: 2200,
    });
  }

  onSubmit(): void {
    if (this.productForm.invalid) return;

    this.isLoading.set(true);
    const editing = this.editingProduct();
    const payload = {
      ...this.productForm.value,
      expiryDate: this.productForm.value.expiryDate || undefined,
    };

    const request$ = editing
      ? this.productService.updateProduct(editing._id, payload)
      : this.productService.createProduct(payload);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open(
          `Product ${editing ? 'updated' : 'created'} successfully.`,
          'Close',
          { duration: 3000 }
        );
        this.closeForm();
        this.loadInventoryData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(
          err.error?.message || 'Operation failed.',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }

  submitInventoryAction(): void {
    if (this.inventoryForm.invalid) return;

    const value = this.inventoryForm.value;
    this.isInventorySaving.set(true);

    this.productService.createInventoryMovement({
      productId: value.productId,
      type: value.type,
      quantity: Number(value.quantity || 0),
      adjustmentStock: Number(value.adjustmentStock || 0),
      reason: value.reason,
      supplier: value.supplier,
      fromLocation: value.fromLocation,
      toLocation: value.toLocation,
      batchNumber: value.batchNumber,
      expiryDate: value.expiryDate || undefined,
      referenceNumber: value.referenceNumber,
    }).subscribe({
      next: (res) => {
        this.isInventorySaving.set(false);
        this.snackBar.open(
          `${this.movementLabel(res.movement.type)} saved. New stock: ${res.product.stock}`,
          'Close',
          { duration: 3500 }
        );
        this.resetInventoryForm(false);
        this.loadInventoryData();
      },
      error: (err) => {
        this.isInventorySaving.set(false);
        this.snackBar.open(
          err.error?.message || 'Inventory action failed.',
          'Close',
          { duration: 3200 }
        );
      },
    });
  }

  resetInventoryForm(showMessage = true): void {
    this.inventoryForm.reset({
      productId: '',
      type: 'stock_in',
      quantity: 1,
      adjustmentStock: 0,
    });

    if (showMessage) {
      this.snackBar.open('Inventory action reset.', 'Close', { duration: 1800 });
    }
  }

  deleteProduct(id: string): void {
    if (!confirm('Are you sure you want to delete this product?')) return;
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.snackBar.open('Product deleted.', 'Close', { duration: 3000 });
        this.loadInventoryData();
      },
      error: () => {
        this.snackBar.open('Delete failed.', 'Close', { duration: 3000 });
      },
    });
  }

  reorderPoint(product: Product): number {
    return Number(product.reorderLevel ?? product.lowStockAlert ?? 0);
  }

  isLowStock(product: Product): boolean {
    return Number(product.stock || 0) <= this.reorderPoint(product);
  }

  expiryStatus(product: Product): 'Healthy' | 'Expiring Soon' | 'Expired' {
    if (!product.expiryDate) return 'Healthy';

    const expiry = new Date(product.expiryDate).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 30);

    if (expiry < today.getTime()) return 'Expired';
    if (expiry <= soon.getTime()) return 'Expiring Soon';
    return 'Healthy';
  }

  inventoryStatus(product: Product): string {
    if (product.stock === 0) return 'Out of Stock';
    if (this.isLowStock(product)) return 'Low Stock';
    const expiry = this.expiryStatus(product);
    if (expiry !== 'Healthy') return expiry;
    return 'Healthy';
  }

  suggestedAction(product: Product): string {
    const status = this.inventoryStatus(product);
    if (status === 'Out of Stock' || status === 'Low Stock') return 'Suggested Action: Reorder';
    if (status === 'Expired') return 'Suggested Action: Remove stock';
    if (status === 'Expiring Soon') return 'Suggested Action: Review batch';
    return 'Suggested Action: Keep selling';
  }

  movementLabel(type: InventoryMovementType): string {
    return this.movementTypes.find((movement) => movement.value === type)?.label || type;
  }

  private toDateInput(value?: Date | string): string {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
  }
}
