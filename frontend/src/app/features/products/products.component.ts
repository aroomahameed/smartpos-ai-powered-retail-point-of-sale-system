import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="products-container">

      <!-- Header -->
      <div class="page-header">
        <h1>
          <mat-icon>inventory_2</mat-icon>
          Products
        </h1>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon>
          Add Product
        </button>
      </div>

      <!-- Search -->
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search products</mat-label>
        <input matInput [(ngModel)]="searchQuery" placeholder="Search by name or SKU..."/>
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <!-- Form -->
      @if (showForm()) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>
              {{ editingProduct() ? 'Edit Product' : 'Add New Product' }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
              <div class="form-grid">

                <mat-form-field appearance="outline">
                  <mat-label>Product Name</mat-label>
                  <input matInput formControlName="name"/>
                  @if (productForm.get('name')?.hasError('required') &&
                       productForm.get('name')?.touched) {
                    <mat-error>Name is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>SKU</mat-label>
                  <input matInput formControlName="sku"/>
                  @if (productForm.get('sku')?.hasError('required') &&
                       productForm.get('sku')?.touched) {
                    <mat-error>SKU is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Price</mat-label>
                  <input matInput type="number" formControlName="price"/>
                  <mat-icon matPrefix>attach_money</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Cost</mat-label>
                  <input matInput type="number" formControlName="cost"/>
                  <mat-icon matPrefix>attach_money</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Stock</mat-label>
                  <input matInput type="number" formControlName="stock"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Low Stock Alert</mat-label>
                  <input matInput type="number" formControlName="lowStockAlert"/>
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

              </div>

              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="closeForm()">
                  Cancel
                </button>
                <button mat-raised-button color="primary" type="submit"
                  [disabled]="productForm.invalid || isLoading()">
                  @if (isLoading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    {{ editingProduct() ? 'Update' : 'Create' }}
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <!-- Table -->
      @if (productService.isLoading()) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <mat-card>
          <table mat-table [dataSource]="filteredProducts()" class="products-table">

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let p">
                <div class="product-name-cell">
                  <strong>{{ p.name }}</strong>
                  <span>{{ p.sku }}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Category</th>
              <td mat-cell *matCellDef="let p">{{ p.category }}</td>
            </ng-container>

            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>Price</th>
              <td mat-cell *matCellDef="let p">{{ p.price | currency }}</td>
            </ng-container>

            <ng-container matColumnDef="stock">
              <th mat-header-cell *matHeaderCellDef>Stock</th>
              <td mat-cell *matCellDef="let p">
                <span class="stock-badge"
                  [class.low]="p.stock <= p.lowStockAlert"
                  [class.out]="p.stock === 0">
                  {{ p.stock }} {{ p.unit }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let p">
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

          @if (filteredProducts().length === 0) {
            <div class="no-data">
              <mat-icon>inventory_2</mat-icon>
              <p>No products found</p>
            </div>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .products-container { padding: 8px; }

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

    .search-field { width: 100%; margin-bottom: 16px; }

    .form-card { margin-bottom: 16px; }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .products-table { width: 100%; }

    .product-name-cell {
      display: flex;
      flex-direction: column;
    }

    .product-name-cell span { color: #999; font-size: 0.8rem; }

    .stock-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.85rem;
      background: #e8f5e9;
      color: #2e7d32;
    }

    .stock-badge.low { background: #fff3e0; color: #e65100; }
    .stock-badge.out { background: #ffebee; color: #c62828; }

    .loading { display: flex; justify-content: center; padding: 48px; }

    .no-data {
      text-align: center;
      padding: 48px;
      color: #999;
    }

    .no-data mat-icon { font-size: 48px; width: 48px; height: 48px; }
  `]
})
export class ProductsComponent implements OnInit {
  productService = inject(ProductService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // 🔷 Signals
  showForm = signal<boolean>(false);
  editingProduct = signal<Product | null>(null);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  displayedColumns = ['name', 'category', 'price', 'stock', 'actions'];

  // 🔷 Form
  productForm: FormGroup = this.fb.group({
    name:          ['', Validators.required],
    sku:           ['', Validators.required],
    price:         [0, [Validators.required, Validators.min(0)]],
    cost:          [0, [Validators.required, Validators.min(0)]],
    stock:         [0, Validators.min(0)],
    lowStockAlert: [10],
    category:      ['', Validators.required],
    unit:          ['pcs'],
    barcode:       [''],
  });

  // 🔷 Computed
  filteredProducts = computed(() =>
    this.productService.products().filter((p) =>
      p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(this.searchQuery.toLowerCase())
    )
  );

  ngOnInit(): void {
    this.productService.getProducts().subscribe();
  }

  openForm(): void {
    this.showForm.set(true);
    this.editingProduct.set(null);
    this.productForm.reset({ unit: 'pcs', lowStockAlert: 10, stock: 0 });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingProduct.set(null);
    this.productForm.reset();
  }

  editProduct(product: Product): void {
    this.editingProduct.set(product);
    this.showForm.set(true);
    this.productForm.patchValue(product);
  }

  onSubmit(): void {
    if (this.productForm.invalid) return;
    this.isLoading.set(true);

    const editing = this.editingProduct();

    const request$ = editing
      ? this.productService.updateProduct(editing._id, this.productForm.value)
      : this.productService.createProduct(this.productForm.value);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open(
          `✅ Product ${editing ? 'updated' : 'created'} successfully!`,
          'Close',
          { duration: 3000 }
        );
        this.closeForm();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(
          err.error?.message || '❌ Operation failed!',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }

  deleteProduct(id: string): void {
    if (!confirm('Are you sure you want to delete this product?')) return;
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.snackBar.open('✅ Product deleted!', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('❌ Delete failed!', 'Close', { duration: 3000 });
      },
    });
  }
}