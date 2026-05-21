import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { ProductService } from '../../core/services/product.service';
import { SaleService } from '../../core/services/sale.service';
import { Product } from '../../core/models/product.model';
import { CartItem } from '../../core/models/sale.model';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
  ],
  template: `
    <div class="pos-container">

      <!-- Left Panel: Products -->
      <div class="products-panel">

        <!-- Search -->
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search products or scan barcode</mat-label>
          <input
            matInput
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)"
            placeholder="Type product name or SKU..."/>
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <!-- Products Grid -->
        @if (productService.isLoading()) {
          <div class="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
        } @else {
          <div class="products-grid">
            @for (product of filteredProducts(); track product._id) {
              <mat-card
                class="product-card"
                [class.out-of-stock]="product.stock === 0"
                (click)="addToCart(product)">
                <mat-card-content>
                  <div class="product-icon">
                    <mat-icon>inventory_2</mat-icon>
                  </div>
                  <p class="product-name">{{ product.name }}</p>
                  <p class="product-sku">{{ product.sku }}</p>
                  <p class="product-price">{{ product.price | currency }}</p>
                  <p class="product-stock"
                    [class.low-stock]="product.stock <= product.lowStockAlert">
                    Stock: {{ product.stock }}
                  </p>
                </mat-card-content>
              </mat-card>
            } @empty {
              <div class="no-products">
                <mat-icon>inventory_2</mat-icon>
                <p>No products found</p>
              </div>
            }
          </div>
        }
      </div>

      <!-- Right Panel: Cart -->
      <div class="cart-panel">
        <div class="cart-header">
          <h2>
            <mat-icon>shopping_cart</mat-icon>
            Current Sale
          </h2>
          <span class="cart-count">{{ cartItems().length }} items</span>
        </div>

        <mat-divider></mat-divider>

        <!-- Cart Items -->
        <div class="cart-items">
          @if (cartItems().length === 0) {
            <div class="empty-cart">
              <mat-icon>remove_shopping_cart</mat-icon>
              <p>Cart is empty</p>
              <span>Click products to add them</span>
            </div>
          } @else {
            @for (item of cartItems(); track item.productId) {
              <div class="cart-item">
                <div class="item-info">
                  <p class="item-name">{{ item.name }}</p>
                  <p class="item-price">{{ item.price | currency }} each</p>
                </div>
                <div class="item-controls">
                  <button mat-icon-button
                    (click)="decreaseQty(item)">
                    <mat-icon>remove</mat-icon>
                  </button>
                  <span class="qty">{{ item.quantity }}</span>
                  <button mat-icon-button
                    (click)="increaseQty(item)">
                    <mat-icon>add</mat-icon>
                  </button>
                  <button mat-icon-button color="warn"
                    (click)="removeItem(item.productId)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                <p class="item-subtotal">
                  {{ item.price * item.quantity | currency }}
                </p>
              </div>
            }
          }
        </div>

        <mat-divider></mat-divider>

        <!-- Totals -->
        <div class="cart-totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>{{ subtotal() | currency }}</span>
          </div>
          <div class="total-row">
            <span>Discount</span>
            <mat-form-field appearance="outline" class="small-field">
              <input matInput type="number" [(ngModel)]="discount" min="0"/>
            </mat-form-field>
          </div>
          <div class="total-row">
            <span>Tax</span>
            <mat-form-field appearance="outline" class="small-field">
              <input matInput type="number" [(ngModel)]="tax" min="0"/>
            </mat-form-field>
          </div>
          <mat-divider></mat-divider>
          <div class="total-row grand-total">
            <span>Total</span>
            <span>{{ total() | currency }}</span>
          </div>
          <div class="total-row">
            <span>Amount Paid</span>
            <mat-form-field appearance="outline" class="small-field">
              <input matInput type="number" [(ngModel)]="amountPaid" min="0"/>
            </mat-form-field>
          </div>
          @if (amountPaid > 0) {
            <div class="total-row change">
              <span>Change</span>
              <span>{{ change() | currency }}</span>
            </div>
          }
        </div>

        <!-- Payment Method -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Payment Method</mat-label>
          <mat-select [(ngModel)]="paymentMethod">
            <mat-option value="cash">
              <mat-icon>payments</mat-icon> Cash
            </mat-option>
            <mat-option value="card">
              <mat-icon>credit_card</mat-icon> Card
            </mat-option>
            <mat-option value="mobile">
              <mat-icon>phone_android</mat-icon> Mobile
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Actions -->
        <div class="cart-actions">
          <button mat-stroked-button color="warn"
            (click)="clearCart()"
            [disabled]="cartItems().length === 0">
            <mat-icon>clear</mat-icon>
            Clear
          </button>
          <button mat-raised-button color="primary"
            (click)="checkout()"
            [disabled]="cartItems().length === 0 || isLoading()">
            @if (isLoading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <mat-icon>point_of_sale</mat-icon>
              Checkout
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pos-container {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 16px;
      height: calc(100vh - 80px);
    }

    /* Products Panel */
    .products-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .search-field { width: 100%; margin-bottom: 8px; }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
      overflow-y: auto;
      padding: 4px;
    }

    .product-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      border-radius: 12px !important;
    }

    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }

    .product-card.out-of-stock {
      opacity: 0.5;
      pointer-events: none;
    }

    .product-card mat-card-content {
      padding: 12px !important;
      text-align: center;
    }

    .product-icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #1a237e;
    }

    .product-name {
      font-weight: 600;
      font-size: 0.85rem;
      margin: 4px 0 2px;
      line-height: 1.2;
    }

    .product-sku { color: #999; font-size: 0.75rem; margin: 0; }
    .product-price { color: #1a237e; font-weight: 700; margin: 4px 0 2px; }
    .product-stock { font-size: 0.75rem; color: #666; margin: 0; }
    .low-stock { color: #f44336 !important; }

    .no-products {
      grid-column: 1/-1;
      text-align: center;
      padding: 48px;
      color: #999;
    }

    .no-products mat-icon { font-size: 48px; width: 48px; height: 48px; }

    .loading { display: flex; justify-content: center; padding: 48px; }

    /* Cart Panel */
    .cart-panel {
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .cart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .cart-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.1rem;
    }

    .cart-count {
      background: #1a237e;
      color: white;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.85rem;
    }

    .cart-items {
      flex: 1;
      overflow-y: auto;
      margin: 12px 0;
    }

    .empty-cart {
      text-align: center;
      padding: 32px;
      color: #999;
    }

    .empty-cart mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-cart p { font-size: 1rem; margin: 8px 0 4px; }
    .empty-cart span { font-size: 0.85rem; }

    .cart-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .item-info { flex: 1; }
    .item-name { margin: 0; font-weight: 500; font-size: 0.9rem; }
    .item-price { margin: 0; color: #666; font-size: 0.8rem; }

    .item-controls {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .qty {
      width: 28px;
      text-align: center;
      font-weight: 600;
    }

    .item-subtotal {
      font-weight: 600;
      color: #1a237e;
      margin: 0;
      min-width: 60px;
      text-align: right;
    }

    /* Totals */
    .cart-totals { padding: 12px 0; }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 0.9rem;
    }

    .grand-total {
      font-size: 1.2rem;
      font-weight: 700;
      color: #1a237e;
      padding: 8px 0;
    }

    .change { color: #2e7d32; font-weight: 600; }

    .small-field {
      width: 100px;
      font-size: 0.85rem;
    }

    .full-width { width: 100%; margin-top: 8px; }

    .cart-actions {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 8px;
      margin-top: 8px;
    }
  `]
})
export class PosComponent implements OnInit {
  productService = inject(ProductService);
  private saleService = inject(SaleService);
  private snackBar = inject(MatSnackBar);

  // 🔷 Signals
  isLoading = signal<boolean>(false);
  searchQuery = '';
  discount = 0;
  tax = 0;
  amountPaid = 0;
  paymentMethod = 'cash';

  // 🔷 Computed Signals
  cartItems = computed(() => this.saleService.cart());

  filteredProducts = computed(() => {
    const query = this.searchQuery.toLowerCase();
    return this.productService.products().filter(
      (p) =>
        p.isActive &&
        (p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query))
    );
  });

  subtotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  total = computed(() =>
    this.subtotal() - this.discount + this.tax
  );

  change = computed(() =>
    this.amountPaid - this.total()
  );

  ngOnInit(): void {
    this.productService.getProducts().subscribe();
  }

  addToCart(product: Product): void {
    if (product.stock === 0) return;
    const cartItem: CartItem = {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost: product.cost,
      quantity: 1,
    };
    this.saleService.addToCart(cartItem);
  }

  increaseQty(item: CartItem): void {
    this.saleService.updateCartItemQuantity(
      item.productId,
      item.quantity + 1
    );
  }

  decreaseQty(item: CartItem): void {
    this.saleService.updateCartItemQuantity(
      item.productId,
      item.quantity - 1
    );
  }

  removeItem(productId: string): void {
    this.saleService.removeFromCart(productId);
  }

  clearCart(): void {
    this.saleService.clearCart();
    this.discount = 0;
    this.tax = 0;
    this.amountPaid = 0;
  }

  onSearch(query: string): void {
    this.searchQuery = query;
  }

  checkout(): void {
    if (this.cartItems().length === 0) return;

    if (this.amountPaid < this.total()) {
      this.snackBar.open(
        '❌ Amount paid is less than total!',
        'Close',
        { duration: 3000, panelClass: 'error-snack' }
      );
      return;
    }

    this.isLoading.set(true);

    const payload = {
      items: this.cartItems().map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      discount: this.discount,
      tax: this.tax,
      paymentMethod: this.paymentMethod,
      amountPaid: this.amountPaid,
    };

    this.saleService.createSale(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.snackBar.open(
          `✅ Sale completed! Invoice: ${res.sale?.invoiceNumber}`,
          'Close',
          { duration: 4000 }
        );
        this.clearCart();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(
          err.error?.message || '❌ Checkout failed!',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }
}