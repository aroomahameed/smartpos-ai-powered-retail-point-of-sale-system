import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductService } from '../../core/services/product.service';
import { SaleService } from '../../core/services/sale.service';
import { CustomerService } from '../../core/services/customer.service';
import { Product } from '../../core/models/product.model';
import { Customer } from '../../core/models/customer.model';
import {
  CartItem,
  CheckoutDiscountConfig,
  Coupon,
  DiscountLine,
  HeldOrder,
  PaymentEntry,
  PaymentMethod,
  SalePaymentMethod,
} from '../../core/models/sale.model';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="checkout-shell">
      <section class="scanner-bar">
        <div class="scanner-title">
          <mat-icon>qr_code_scanner</mat-icon>
          <div>
            <p>Checkout</p>
            <h1>Product Search / Barcode Scanner</h1>
          </div>
        </div>

        <mat-form-field appearance="outline" class="scanner-field">
          <mat-label>Search Product / Barcode Scanner</mat-label>
          <input
            matInput
            autofocus
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)"
            (keyup.enter)="scanProduct()"
            placeholder="Scan barcode, enter SKU, or search product name"/>
          <button mat-icon-button matSuffix type="button" (click)="scanProduct()">
            <mat-icon>add_shopping_cart</mat-icon>
          </button>
        </mat-form-field>
      </section>

      <section class="checkout-layout">
        <main class="catalog-panel">
          <div class="catalog-toolbar">
            <div>
              <h2>Product Grid</h2>
              <p>{{ filteredProducts().length }} products ready for checkout</p>
            </div>

            <div class="stock-summary">
              <span>{{ availableProductsCount() }} available</span>
              <span>{{ lowStockCount() }} low stock</span>
            </div>
          </div>

          <div class="category-strip" aria-label="Category filters">
            @for (category of categories(); track category) {
              <button
                type="button"
                class="category-chip"
                [class.active]="selectedCategory === category"
                (click)="selectCategory(category)">
                {{ category }}
              </button>
            }
          </div>

          @if (productService.isLoading()) {
            <div class="loading">
              <mat-spinner diameter="42"></mat-spinner>
            </div>
          } @else {
            <div class="products-grid">
              @for (product of filteredProducts(); track product._id) {
                <mat-card
                  class="product-card"
                  [class.out-of-stock]="product.stock === 0"
                  [class.low-stock-card]="product.stock > 0 && product.stock <= product.lowStockAlert"
                  (click)="addToCart(product)">
                  <mat-card-content>
                    <div class="product-card-top">
                      <span class="category-label">{{ formatCategory(product.category) }}</span>
                      <span class="stock-pill" [class]="stockClass(product)">
                        {{ stockStatus(product) }}
                      </span>
                    </div>

                    <div class="product-icon">
                      <mat-icon>inventory_2</mat-icon>
                    </div>

                    <h3>{{ product.name }}</h3>
                    <p class="product-meta">{{ product.sku }}</p>

                    @if (product.barcode) {
                      <p class="barcode">
                        <mat-icon>barcode</mat-icon>
                        {{ product.barcode }}
                      </p>
                    }

                    <div class="product-card-bottom">
                      <strong>{{ product.price | currency }}</strong>
                      <span>{{ product.stock }} {{ product.unit }}</span>
                    </div>
                  </mat-card-content>
                </mat-card>
              } @empty {
                <div class="empty-products">
                  <mat-icon>inventory_2</mat-icon>
                  <h3>No products found</h3>
                  <p>Try a different product name, SKU, barcode, or category.</p>
                </div>
              }
            </div>
          }
        </main>

        <aside class="cart-panel">
          <div class="cart-header">
            <div>
              <p>Cart Panel</p>
              <h2>
                <mat-icon>shopping_cart</mat-icon>
                Current Sale
              </h2>
            </div>
            <span class="cart-count">{{ cartItems().length }} items</span>
          </div>

          <mat-divider></mat-divider>

          <mat-form-field appearance="outline" class="customer-field">
            <mat-label>Customer</mat-label>
            <mat-select [(ngModel)]="selectedCustomerId" (selectionChange)="onCustomerChange()">
              <mat-option value="">Walk-in</mat-option>
              @for (customer of customerService.customers(); track customer._id) {
                <mat-option [value]="customer._id">
                  {{ customer.name }} - {{ customer.phone }}
                </mat-option>
              }
            </mat-select>
            <mat-icon matSuffix>person</mat-icon>
          </mat-form-field>

          @if (selectedCustomer()) {
            <div class="loyalty-strip">
              <span>{{ selectedCustomer()?.name }}</span>
              <strong>{{ selectedCustomer()?.loyaltyPoints || 0 }} loyalty points</strong>
            </div>
          }

          <div class="cart-items">
            @if (cartItems().length === 0) {
              <div class="empty-cart">
                <mat-icon>remove_shopping_cart</mat-icon>
                <h3>No items yet</h3>
                <p>Scan a barcode or choose products from the grid.</p>
              </div>
            } @else {
              @for (item of cartItems(); track item.productId) {
                <div class="cart-item">
                  <div class="item-main">
                    <div class="item-info">
                      <strong>{{ item.name }}</strong>
                      <span>{{ item.sku }} - {{ item.category || 'General' }} - {{ item.price | currency }} each</span>
                    </div>
                    <button mat-icon-button color="warn" (click)="removeItem(item.productId)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>

                  <div class="item-footer">
                    <div class="qty-stepper">
                      <button mat-icon-button (click)="decreaseQty(item)">
                        <mat-icon>remove</mat-icon>
                      </button>
                      <span>{{ item.quantity }}</span>
                      <button mat-icon-button (click)="increaseQty(item)">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>

                    <mat-form-field appearance="outline" class="item-discount-field">
                      <mat-label>Product %</mat-label>
                      <input
                        matInput
                        type="number"
                        min="0"
                        max="100"
                        [ngModel]="item.productDiscountPercent || 0"
                        (ngModelChange)="setProductDiscount(item, $event)"/>
                    </mat-form-field>

                    <div class="line-total">
                      @if (productDiscountAmount(item) > 0) {
                        <span>-{{ productDiscountAmount(item) | currency }}</span>
                      }
                      <strong>{{ productLineTotal(item) | currency }}</strong>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          @if (heldOrders().length > 0) {
            <section class="held-orders">
              <div class="held-orders-header">
                <h3>
                  <mat-icon>pause_circle</mat-icon>
                  Held Orders
                </h3>
                <span>{{ heldOrders().length }}</span>
              </div>

              <div class="held-order-list">
                @for (order of heldOrders(); track order.id) {
                  <div class="held-order-card">
                    <div>
                      <strong>Order #{{ order.id }} held</strong>
                      <span>Customer: {{ order.customerName }}</span>
                      <span>Items: {{ heldOrderItemCount(order) }}</span>
                    </div>
                    <div class="held-order-actions">
                      <span>{{ heldOrderTotal(order) | currency }}</span>
                      <button mat-stroked-button color="primary" (click)="resumeOrder(order.id)">
                        Resume Order
                      </button>
                      <button mat-icon-button color="warn" (click)="deleteHeldOrder(order.id)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <div class="payment-panel">
            <div class="total-line">
              <span>Subtotal</span>
              <strong>{{ subtotal() | currency }}</strong>
            </div>

            <section class="discount-panel">
              <div class="discount-header">
                <h3>
                  <mat-icon>local_offer</mat-icon>
                  Discounts
                </h3>
                <span>{{ totalDiscount() | currency }}</span>
              </div>

              <div class="discount-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Percentage %</mat-label>
                  <input matInput type="number" [(ngModel)]="percentageDiscount" min="0" max="100"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Fixed discount</mat-label>
                  <input matInput type="number" [(ngModel)]="fixedDiscount" min="0"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Category</mat-label>
                  <mat-select [(ngModel)]="categoryDiscountCategory">
                    <mat-option value="All">No category discount</mat-option>
                    @for (category of categories().slice(1); track category) {
                      <mat-option [value]="category">{{ category }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Category %</mat-label>
                  <input matInput type="number" [(ngModel)]="categoryDiscountPercent" min="0" max="100"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Redeem Points</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="loyaltyPointsToRedeem"
                    min="0"
                    [disabled]="!selectedCustomer()"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Tax</mat-label>
                  <input matInput type="number" [(ngModel)]="tax" min="0"/>
                </mat-form-field>
              </div>

              <div class="coupon-row">
                <mat-form-field appearance="outline">
                  <mat-label>Coupon code</mat-label>
                  <input matInput [(ngModel)]="couponCode" placeholder="EID10"/>
                </mat-form-field>
                <button
                  mat-stroked-button
                  color="primary"
                  (click)="applyCoupon()"
                  [disabled]="isApplyingCoupon() || !couponCode.trim() || cartItems().length === 0">
                  @if (isApplyingCoupon()) {
                    <mat-spinner diameter="18"></mat-spinner>
                  } @else {
                    <mat-icon>sell</mat-icon>
                    Apply
                  }
                </button>
                @if (appliedCoupon()) {
                  <button mat-icon-button color="warn" (click)="clearCoupon()">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>

              @if (appliedCoupon()) {
                <div class="coupon-meta">
                  <strong>{{ appliedCoupon()?.code }}</strong>
                  <span>
                    {{ appliedCoupon()?.discountType === 'percentage' ? appliedCoupon()?.discountValue + '%' : (appliedCoupon()?.discountValue | currency) }}
                    off - valid until {{ appliedCoupon()?.expiresAt | date:'mediumDate' }} - minimum bill {{ appliedCoupon()?.minimumPurchaseAmount | currency }}
                  </span>
                </div>
              }

              @if (selectedCustomer()) {
                <div class="coupon-meta">
                  <strong>Loyalty rule</strong>
                  <span>
                    Every 1 spent earns 1 point. 100 points redeem {{ loyaltyValueForPoints(100) | currency }}.
                    Current redemption: {{ loyaltyRedemptionAmount() | currency }}
                  </span>
                </div>
              }

              @if (discountLines().length > 0) {
                <div class="discount-breakdown">
                  @for (line of discountLines(); track line.label + line.amount) {
                    <div>
                      <span>{{ line.label }}</span>
                      <strong>-{{ line.amount | currency }}</strong>
                    </div>
                  }
                </div>
              }
            </section>

            <section class="split-payment-panel">
              <div class="split-payment-header">
                <h3>
                  <mat-icon>call_split</mat-icon>
                  Split Payment
                </h3>
                <span>{{ paymentStatusLabel() }}</span>
              </div>

              <div class="split-payment-row">
                <div>
                  <mat-icon>payments</mat-icon>
                  <span>Cash</span>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Cash</mat-label>
                  <input matInput type="number" [(ngModel)]="splitCash" min="0"/>
                </mat-form-field>
              </div>

              <div class="split-payment-row">
                <div>
                  <mat-icon>credit_card</mat-icon>
                  <span>Card</span>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Card</mat-label>
                  <input matInput type="number" [(ngModel)]="splitCard" min="0"/>
                </mat-form-field>
              </div>

              <div class="split-payment-row">
                <div>
                  <mat-icon>phone_android</mat-icon>
                  <span>Easypaisa/JazzCash</span>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Mobile Wallet</mat-label>
                  <input matInput type="number" [(ngModel)]="splitMobile" min="0"/>
                </mat-form-field>
              </div>

              <div class="split-payment-summary">
                <div>
                  <span>Paid</span>
                  <strong>{{ paidTotal() | currency }}</strong>
                </div>
                <div [class.negative]="remainingBalance() > 0">
                  <span>Remaining</span>
                  <strong>{{ remainingBalance() | currency }}</strong>
                </div>
              </div>
            </section>

            <div class="checkout-total">
              <span>Total</span>
              <strong>{{ total() | currency }}</strong>
            </div>

            <div class="change-line" [class.negative]="changeAmount() < 0">
              <span>Change</span>
              <strong>{{ changeAmount() | currency }}</strong>
            </div>
          </div>

          <div class="cart-actions">
            <button
              mat-stroked-button
              color="primary"
              (click)="holdOrder()"
              [disabled]="cartItems().length === 0">
              <mat-icon>pause_circle</mat-icon>
              Hold
            </button>
            <button
              mat-stroked-button
              color="warn"
              (click)="clearCart()"
              [disabled]="cartItems().length === 0">
              <mat-icon>clear</mat-icon>
              Clear
            </button>
            <button
              mat-flat-button
              color="primary"
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
        </aside>
      </section>
    </div>
  `,
  styles: [`
    .checkout-shell {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
      color: #172033;
    }

    .scanner-bar {
      display: grid;
      grid-template-columns: minmax(260px, 380px) minmax(0, 1fr);
      gap: 14px;
      align-items: center;
      padding: 14px;
      border: 1px solid #e7edf3;
      border-radius: 18px;
      background:
        linear-gradient(135deg, rgba(18, 38, 50, 0.96), rgba(34, 73, 83, 0.9)),
        radial-gradient(circle at 92% 10%, rgba(112, 192, 171, 0.45), transparent 34%);
      box-shadow: 0 16px 38px rgba(18, 39, 54, 0.16);
    }

    .scanner-title {
      display: flex;
      align-items: center;
      gap: 14px;
      color: white;
      min-width: 0;
    }

    .scanner-title > mat-icon {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      flex: 0 0 48px;
      border-radius: 14px;
      background: rgba(255,255,255,0.14);
      color: #bce9dd;
      font-size: 30px;
    }

    .scanner-title p,
    .scanner-title h1 {
      margin: 0;
    }

    .scanner-title p {
      color: rgba(255,255,255,0.7);
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .scanner-title h1 {
      margin-top: 4px;
      font-size: 1.35rem;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: 0;
    }

    .scanner-field {
      width: 100%;
      margin-bottom: -20px;
    }

    .scanner-field ::ng-deep .mat-mdc-text-field-wrapper {
      background: white;
      border-radius: 12px;
    }

    .checkout-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 400px;
      gap: 14px;
      align-items: stretch;
      min-height: 0;
    }

    .catalog-panel,
    .cart-panel {
      box-sizing: border-box;
      min-height: 0;
      border: 1px solid #e7edf3;
      border-radius: 18px;
      background: #ffffff;
      box-shadow: 0 10px 26px rgba(25, 45, 70, 0.07);
    }

    .catalog-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
    }

    .catalog-toolbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 12px;
    }

    .catalog-toolbar h2,
    .catalog-toolbar p,
    .cart-header h2,
    .cart-header p {
      margin: 0;
    }

    .catalog-toolbar h2,
    .cart-header h2 {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0;
    }

    .catalog-toolbar p,
    .cart-header p {
      margin-top: 3px;
      color: #718093;
      font-size: 0.83rem;
    }

    .stock-summary {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .stock-summary span {
      padding: 6px 10px;
      border-radius: 999px;
      background: #f3f7fa;
      color: #465668;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .category-strip {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 12px;
    }

    .category-chip {
      flex: 0 0 auto;
      min-height: 34px;
      padding: 0 13px;
      border: 1px solid #d9e2eb;
      border-radius: 999px;
      background: #ffffff;
      color: #536274;
      cursor: pointer;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 800;
    }

    .category-chip.active {
      border-color: #1f6f64;
      background: #e8f6f1;
      color: #165a51;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 12px;
      overflow-y: auto;
      padding: 2px 4px 8px;
    }

    .product-card {
      min-height: 188px;
      border: 1px solid #edf1f5;
      border-radius: 14px !important;
      cursor: pointer;
      box-shadow: none;
      transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
    }

    .product-card:hover {
      transform: translateY(-2px);
      border-color: #b6d8d1;
      box-shadow: 0 12px 28px rgba(26, 65, 79, 0.12) !important;
    }

    .product-card.out-of-stock {
      opacity: 0.58;
      pointer-events: none;
    }

    .product-card.low-stock-card {
      border-color: #f2d39b;
    }

    .product-card mat-card-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 12px !important;
    }

    .product-card-top,
    .product-card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .category-label {
      overflow: hidden;
      max-width: 92px;
      color: #718093;
      font-size: 0.72rem;
      font-weight: 800;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-transform: uppercase;
    }

    .stock-pill {
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 900;
      white-space: nowrap;
    }

    .stock-pill.in-stock {
      background: #e9f8ef;
      color: #1d773d;
    }

    .stock-pill.low-stock {
      background: #fff4df;
      color: #975f00;
    }

    .stock-pill.out-stock {
      background: #fff0f0;
      color: #a7282e;
    }

    .product-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      margin-top: 14px;
      border-radius: 13px;
      background: #eef7f4;
      color: #16665c;
    }

    .product-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .product-card h3 {
      display: -webkit-box;
      overflow: hidden;
      min-height: 40px;
      margin: 12px 0 4px;
      font-size: 0.98rem;
      line-height: 1.25;
      font-weight: 800;
      letter-spacing: 0;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .product-meta,
    .barcode {
      margin: 0;
      color: #768394;
      font-size: 0.78rem;
    }

    .barcode {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 3px;
    }

    .barcode mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }

    .product-card-bottom {
      margin-top: auto;
      padding-top: 12px;
    }

    .product-card-bottom strong {
      color: #133f67;
      font-size: 1rem;
    }

    .product-card-bottom span {
      color: #718093;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .cart-panel {
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 106px);
      padding: 14px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .cart-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .cart-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cart-count {
      padding: 5px 10px;
      border-radius: 999px;
      background: #eaf2ff;
      color: #2457a6;
      font-size: 0.78rem;
      font-weight: 900;
      white-space: nowrap;
    }

    .customer-field {
      width: 100%;
      margin: 10px 0 -10px;
    }

    .loyalty-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 4px 0 8px;
      padding: 8px 10px;
      border: 1px solid #dcebe6;
      border-radius: 12px;
      background: #f0faf6;
      color: #165a51;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .cart-items {
      flex: 1 1 96px;
      min-height: 88px;
      max-height: 190px;
      overflow-y: auto;
      padding: 10px 2px;
    }

    .cart-item {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid #edf1f5;
      border-radius: 14px;
      background: #fbfcfe;
    }

    .cart-item + .cart-item {
      margin-top: 10px;
    }

    .item-main,
    .item-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .item-discount-field {
      width: 104px;
      margin-bottom: -20px;
    }

    .line-total {
      display: grid;
      gap: 2px;
      min-width: 76px;
      text-align: right;
    }

    .line-total span {
      color: #1d773d;
      font-size: 0.72rem;
      font-weight: 900;
    }

    .line-total strong {
      font-size: 0.9rem;
    }

    .item-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .item-info strong {
      overflow: hidden;
      font-size: 0.92rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-info span {
      color: #758294;
      font-size: 0.78rem;
    }

    .qty-stepper {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px;
      border: 1px solid #dce5ee;
      border-radius: 999px;
      background: white;
    }

    .qty-stepper button {
      width: 30px;
      height: 30px;
      padding: 0;
    }

    .qty-stepper span {
      min-width: 24px;
      text-align: center;
      font-weight: 900;
    }

    .held-orders {
      display: grid;
      gap: 8px;
      padding: 10px 0;
      border-top: 1px solid #edf1f5;
    }

    .held-orders-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .held-orders-header h3 {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      font-size: 0.92rem;
      font-weight: 900;
      letter-spacing: 0;
    }

    .held-orders-header span {
      display: inline-grid;
      place-items: center;
      min-width: 26px;
      height: 26px;
      border-radius: 999px;
      background: #fff4df;
      color: #975f00;
      font-size: 0.76rem;
      font-weight: 900;
    }

    .held-order-list {
      display: grid;
      gap: 8px;
      max-height: 128px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .held-order-card {
      display: grid;
      gap: 10px;
      padding: 11px;
      border: 1px solid #e4edf5;
      border-radius: 13px;
      background: #fffaf1;
    }

    .held-order-card > div:first-child {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .held-order-card strong {
      color: #172033;
      font-size: 0.9rem;
    }

    .held-order-card span {
      color: #697789;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .held-order-actions {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 8px;
    }

    .held-order-actions > span {
      color: #975f00;
      font-size: 0.86rem;
      font-weight: 900;
    }

    .held-order-actions button {
      min-height: 34px;
      border-radius: 8px;
      white-space: nowrap;
    }

    .payment-panel {
      display: grid;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #edf1f5;
    }

    .total-line,
    .checkout-total,
    .change-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .total-line span,
    .change-line span {
      color: #6f7f91;
      font-weight: 700;
    }

    .adjustments-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .adjustments-grid mat-form-field {
      width: 100%;
      margin-bottom: -18px;
    }

    .discount-panel {
      display: grid;
      gap: 8px;
      padding: 10px;
      border: 1px solid #e4edf5;
      border-radius: 14px;
      background: #fbf8f2;
    }

    .discount-header,
    .coupon-row,
    .discount-breakdown div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .discount-header h3 {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      font-size: 0.92rem;
      font-weight: 900;
      letter-spacing: 0;
    }

    .discount-header mat-icon {
      color: #9a6400;
    }

    .discount-header span {
      padding: 4px 8px;
      border-radius: 999px;
      background: #fff;
      color: #9a6400;
      font-size: 0.76rem;
      font-weight: 900;
    }

    .discount-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .discount-grid mat-form-field,
    .coupon-row mat-form-field {
      width: 100%;
      margin-bottom: -18px;
    }

    .coupon-row {
      align-items: stretch;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
    }

    .coupon-row button {
      min-height: 40px;
      border-radius: 8px;
    }

    .coupon-meta {
      display: grid;
      gap: 2px;
      padding: 8px 10px;
      border-radius: 10px;
      background: white;
      border: 1px solid #eadcc4;
      color: #6f4c00;
      font-size: 0.76rem;
      font-weight: 800;
    }

    .discount-breakdown {
      display: grid;
      gap: 5px;
      padding-top: 2px;
    }

    .discount-breakdown div {
      padding: 6px 8px;
      border-radius: 9px;
      background: white;
      border: 1px solid #efe4d2;
      color: #5f6976;
      font-size: 0.76rem;
      font-weight: 800;
    }

    .discount-breakdown strong {
      color: #1d773d;
      white-space: nowrap;
    }

    .split-payment-panel {
      display: grid;
      gap: 7px;
      padding: 10px;
      border: 1px solid #e4edf5;
      border-radius: 14px;
      background: #f8fbfd;
    }

    .split-payment-header,
    .split-payment-row,
    .split-payment-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .split-payment-header h3 {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      font-size: 0.92rem;
      font-weight: 900;
      letter-spacing: 0;
    }

    .split-payment-header span {
      padding: 4px 8px;
      border-radius: 999px;
      background: #e8f6f1;
      color: #165a51;
      font-size: 0.72rem;
      font-weight: 900;
    }

    .split-payment-row > div {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 145px;
      color: #4e5f72;
      font-size: 0.82rem;
      font-weight: 900;
    }

    .split-payment-row mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: #16665c;
    }

    .split-payment-row mat-form-field {
      width: 132px;
      margin-bottom: -20px;
    }

    .split-payment-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding-top: 4px;
    }

    .split-payment-summary div {
      display: grid;
      gap: 2px;
      padding: 8px 10px;
      border-radius: 10px;
      background: white;
      border: 1px solid #edf1f5;
    }

    .split-payment-summary span {
      color: #738195;
      font-size: 0.72rem;
      font-weight: 800;
    }

    .split-payment-summary strong {
      color: #172033;
      font-size: 0.92rem;
      font-weight: 900;
    }

    .split-payment-summary .negative strong {
      color: #a7282e;
    }

    .checkout-total {
      margin-top: 2px;
      padding: 11px 12px;
      border-radius: 14px;
      background: #122632;
      color: white;
    }

    .checkout-total span {
      color: rgba(255,255,255,0.72);
      font-weight: 800;
    }

    .checkout-total strong {
      font-size: 1.25rem;
      letter-spacing: 0;
    }

    .change-line {
      color: #1d773d;
      font-weight: 900;
    }

    .change-line.negative {
      color: #a7282e;
    }

    .cart-actions {
      display: grid;
      grid-template-columns: 1fr 1fr 1.55fr;
      gap: 10px;
      margin-top: 10px;
      flex-shrink: 0;
      position: sticky;
      bottom: 0;
      z-index: 2;
      padding-top: 8px;
      background: white;
    }

    .cart-actions button {
      min-height: 44px;
      border-radius: 8px;
    }

    .empty-cart,
    .empty-products,
    .loading {
      display: grid;
      place-items: center;
      gap: 8px;
      color: #8290a1;
      text-align: center;
    }

    .empty-cart {
      min-height: 240px;
      padding: 26px;
    }

    .empty-products {
      grid-column: 1 / -1;
      min-height: 280px;
      border: 1px dashed #d9e2eb;
      border-radius: 16px;
    }

    .empty-cart mat-icon,
    .empty-products mat-icon {
      width: 44px;
      height: 44px;
      font-size: 44px;
      color: #9aa7b5;
    }

    .empty-cart h3,
    .empty-products h3,
    .empty-cart p,
    .empty-products p {
      margin: 0;
    }

    .loading {
      min-height: 320px;
    }

    @media (max-width: 1180px) {
      .checkout-layout {
        grid-template-columns: 1fr;
      }

      .cart-panel {
        order: -1;
        max-height: min(520px, calc(100vh - 292px));
        overflow-y: auto;
      }

      .empty-cart {
        min-height: 120px;
      }

      .cart-items {
        max-height: 150px;
      }
    }

    @media (max-width: 760px) {
      .scanner-bar {
        grid-template-columns: 1fr;
      }

      .catalog-toolbar {
        flex-direction: column;
      }

      .stock-summary {
        justify-content: flex-start;
      }

      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
      }
    }

    @media (max-width: 520px) {
      .scanner-bar,
      .catalog-panel,
      .cart-panel {
        border-radius: 14px;
      }

      .adjustments-grid,
      .discount-grid,
      .coupon-row,
      .cart-actions,
      .split-payment-summary {
        grid-template-columns: 1fr;
      }

      .item-footer {
        align-items: stretch;
        flex-direction: column;
      }

      .item-discount-field,
      .line-total {
        width: 100%;
      }

      .line-total {
        text-align: left;
      }

      .split-payment-row {
        align-items: stretch;
        flex-direction: column;
      }

      .split-payment-row mat-form-field {
        width: 100%;
      }

      .held-order-actions {
        grid-template-columns: 1fr;
      }

      .scanner-title h1 {
        font-size: 1.1rem;
      }
    }
  `],
})
export class PosComponent implements OnInit {
  productService = inject(ProductService);
  private saleService = inject(SaleService);
  customerService = inject(CustomerService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal<boolean>(false);
  isApplyingCoupon = signal<boolean>(false);
  appliedCoupon = signal<Coupon | null>(null);
  searchQuery = '';
  selectedCategory = 'All';
  selectedCustomerId = '';
  customerName = 'Walk-in';
  percentageDiscount = 0;
  fixedDiscount = 0;
  categoryDiscountCategory = 'All';
  categoryDiscountPercent = 0;
  loyaltyPointsToRedeem = 0;
  couponCode = '';
  discount = 0;
  tax = 0;
  splitCash = 0;
  splitCard = 0;
  splitMobile = 0;
  paymentMethod: PaymentMethod = 'cash';

  cartItems = computed(() => this.saleService.cart());
  heldOrders = computed(() => this.saleService.heldOrders());

  categories = computed(() => {
    const categories = new Map<string, string>();

    this.productService.products()
      .filter((product) => product.isActive && product.category)
      .forEach((product) => {
        const label = this.formatCategory(product.category);
        categories.set(label.toLowerCase(), label);
      });

    return ['All', ...Array.from(categories.values()).sort()];
  });

  availableProductsCount = computed(() =>
    this.productService.products().filter(
      (product) => product.isActive && product.stock > 0
    ).length
  );

  lowStockCount = computed(() =>
    this.productService.products().filter(
      (product) =>
        product.isActive &&
        product.stock > 0 &&
        product.stock <= product.lowStockAlert
    ).length
  );

  filteredProducts = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();

    return this.productService.products().filter((product) => {
      const matchesCategory =
        this.selectedCategory === 'All' ||
        this.formatCategory(product.category) === this.selectedCategory;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.barcode || '').toLowerCase().includes(query);

      return product.isActive && matchesCategory && matchesSearch;
    });
  });

  subtotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  ngOnInit(): void {
    this.productService.getProducts().subscribe();
    this.customerService.getCustomers().subscribe();
  }

  selectedCustomer(): Customer | null {
    if (!this.selectedCustomerId) return null;
    return this.customerService.customers().find(
      (customer) => customer._id === this.selectedCustomerId
    ) || null;
  }

  total(): number {
    return this.roundMoney(
      Math.max(this.subtotal() - this.totalDiscount() + this.normalizeAmount(this.tax), 0)
    );
  }

  discountLines(): DiscountLine[] {
    const lines: DiscountLine[] = [];

    for (const item of this.cartItems()) {
      const amount = this.productDiscountAmount(item);
      if (amount > 0) {
        lines.push({
          type: 'product',
          label: `${item.name} product discount`,
          value: this.normalizePercent(item.productDiscountPercent || 0),
          amount,
          scope: item.productId,
        });
      }
    }

    const percentage = this.normalizePercent(this.percentageDiscount);
    if (percentage > 0) {
      lines.push({
        type: 'percentage',
        label: `Percentage discount ${percentage}%`,
        value: percentage,
        amount: this.roundMoney(this.subtotal() * (percentage / 100)),
      });
    }

    const fixed = this.normalizeAmount(this.fixedDiscount);
    if (fixed > 0) {
      lines.push({
        type: 'fixed',
        label: 'Fixed discount',
        amount: fixed,
      });
    }

    const categoryPercent = this.normalizePercent(this.categoryDiscountPercent);
    if (this.categoryDiscountCategory !== 'All' && categoryPercent > 0) {
      const categorySubtotal = this.cartItems()
        .filter((item) => this.formatCategory(item.category || '') === this.categoryDiscountCategory)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
      const amount = this.roundMoney(categorySubtotal * (categoryPercent / 100));

      if (amount > 0) {
        lines.push({
          type: 'category',
          label: `${this.categoryDiscountCategory} category discount`,
          value: categoryPercent,
          amount,
          scope: this.categoryDiscountCategory,
        });
      }
    }

    const customer = this.selectedCustomer();
    const redeemedPoints = this.redeemableLoyaltyPoints();
    if (customer && redeemedPoints > 0) {
      lines.push({
        type: 'loyalty',
        label: `${customer.name} loyalty points`,
        value: redeemedPoints,
        amount: this.loyaltyRedemptionAmount(),
        scope: customer._id,
      });
    }

    const coupon = this.appliedCoupon();
    if (coupon && this.isCouponCurrentlyValid(coupon)) {
      lines.push({
        type: 'coupon',
        label: `Coupon ${coupon.code}`,
        value: coupon.discountValue,
        amount: this.couponDiscountAmount(coupon),
        code: coupon.code,
      });
    }

    return lines.filter((line) => line.amount > 0);
  }

  totalDiscount(): number {
    return this.roundMoney(Math.min(
      this.discountLines().reduce((sum, line) => sum + line.amount, 0),
      this.subtotal()
    ));
  }

  paidTotal(): number {
    return this.normalizeAmount(this.splitCash) +
      this.normalizeAmount(this.splitCard) +
      this.normalizeAmount(this.splitMobile);
  }

  remainingBalance(): number {
    return Math.max(this.total() - this.paidTotal(), 0);
  }

  changeAmount(): number {
    return this.paidTotal() - this.total();
  }

  paymentStatusLabel(): string {
    if (this.cartItems().length === 0) return 'No payment';
    if (this.remainingBalance() > 0) return 'Balance due';
    return this.paymentEntries().length > 1 ? 'Split paid' : 'Paid';
  }

  paymentEntries(): PaymentEntry[] {
    return [
      { method: 'cash' as PaymentMethod, amount: this.normalizeAmount(this.splitCash) },
      { method: 'card' as PaymentMethod, amount: this.normalizeAmount(this.splitCard) },
      { method: 'mobile' as PaymentMethod, amount: this.normalizeAmount(this.splitMobile) },
    ].filter((payment) => payment.amount > 0);
  }

  finalPaymentMethod(): SalePaymentMethod {
    const entries = this.paymentEntries();
    if (entries.length > 1) return 'split';
    return entries[0]?.method || this.paymentMethod;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  onCustomerChange(): void {
    const customer = this.selectedCustomer();
    this.customerName = customer ? customer.name : 'Walk-in';
  }

  applyCoupon(): void {
    const code = this.couponCode.trim().toUpperCase();
    if (!code || this.cartItems().length === 0) return;

    this.isApplyingCoupon.set(true);
    this.saleService.validateCoupon(code, this.subtotal()).subscribe({
      next: (res) => {
        this.isApplyingCoupon.set(false);
        this.appliedCoupon.set(res.coupon);
        this.couponCode = res.coupon.code;
        this.snackBar.open(
          `${res.coupon.code} applied.`,
          'Close',
          { duration: 2500 }
        );
      },
      error: (err) => {
        this.isApplyingCoupon.set(false);
        this.appliedCoupon.set(null);
        this.snackBar.open(
          err.error?.message || 'Coupon could not be applied.',
          'Close',
          { duration: 3200 }
        );
      },
    });
  }

  clearCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponCode = '';
  }

  formatCategory(category: string): string {
    return category
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private normalizeAmount(value: number): number {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  private normalizePercent(value: number): number {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.min(amount, 100);
  }

  private roundMoney(value: number): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  productDiscountAmount(item: CartItem): number {
    const percent = this.normalizePercent(item.productDiscountPercent || 0);
    return this.roundMoney(item.price * item.quantity * (percent / 100));
  }

  productLineTotal(item: CartItem): number {
    return this.roundMoney(item.price * item.quantity - this.productDiscountAmount(item));
  }

  couponDiscountAmount(coupon: Coupon): number {
    const amount = coupon.discountType === 'percentage'
      ? this.subtotal() * (coupon.discountValue / 100)
      : coupon.discountValue;

    return this.roundMoney(Math.min(amount, this.subtotal()));
  }

  loyaltyValueForPoints(points: number): number {
    return this.roundMoney((Math.floor(Number(points || 0) / 100) * 5));
  }

  redeemableLoyaltyPoints(): number {
    const customer = this.selectedCustomer();
    if (!customer) return 0;

    const requested = Math.max(Math.floor(Number(this.loyaltyPointsToRedeem || 0)), 0);
    const available = Math.max(Number(customer.loyaltyPoints || 0), 0);
    return Math.floor(Math.min(requested, available) / 100) * 100;
  }

  loyaltyRedemptionAmount(): number {
    return Math.min(this.loyaltyValueForPoints(this.redeemableLoyaltyPoints()), this.subtotal());
  }

  isCouponCurrentlyValid(coupon: Coupon): boolean {
    return Boolean(
      coupon.isActive &&
      this.subtotal() >= coupon.minimumPurchaseAmount &&
      new Date(coupon.expiresAt).getTime() >= Date.now()
    );
  }

  scanProduct(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return;

    const product = this.productService.products().find((item) =>
      item.isActive &&
      item.stock > 0 &&
      (
        item.sku.toLowerCase() === query ||
        (item.barcode || '').toLowerCase() === query
      )
    );

    if (!product) return;

    this.addToCart(product);
    this.searchQuery = '';
  }

  addToCart(product: Product): void {
    if (product.stock === 0) return;
    const cartItem: CartItem = {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      cost: product.cost,
      quantity: 1,
      productDiscountPercent: 0,
    };
    this.saleService.addToCart(cartItem);
  }

  setProductDiscount(item: CartItem, value: number): void {
    this.saleService.updateCartItemDiscount(item.productId, value);
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

  holdOrder(): void {
    if (this.cartItems().length === 0) return;

    const heldOrder = this.saleService.holdOrder({
      customerName: this.customerName.trim() || 'Walk-in',
      items: this.cartItems(),
      discount: this.totalDiscount(),
      discountConfig: this.discountConfig(),
      tax: this.tax,
      paymentMethod: this.finalPaymentMethod(),
      payments: this.paymentEntries(),
      amountPaid: this.paidTotal(),
    });

    this.resetSaleInputs();
    this.snackBar.open(
      `Order #${heldOrder.id} held.`,
      'Close',
      { duration: 3000 }
    );
  }

  resumeOrder(id: number): void {
    if (this.cartItems().length > 0) {
      this.snackBar.open(
        'Hold or clear the current sale before resuming another order.',
        'Close',
        { duration: 3500 }
      );
      return;
    }

    const order = this.saleService.resumeHeldOrder(id);
    if (!order) return;

    this.customerName = order.customerName;
    this.selectedCustomerId = '';
    this.applyDiscountConfig(order.discountConfig);
    if (!order.discountConfig) {
      this.fixedDiscount = order.discount;
    }
    this.tax = order.tax;
    this.applyPayments(order.payments || [{
      method: order.paymentMethod === 'split' ? 'cash' : order.paymentMethod,
      amount: order.amountPaid,
    }]);

    if (this.couponCode) {
      this.applyCoupon();
    }

    this.snackBar.open(
      `Order #${order.id} resumed.`,
      'Close',
      { duration: 3000 }
    );
  }

  deleteHeldOrder(id: number): void {
    this.saleService.deleteHeldOrder(id);
    this.snackBar.open(
      `Order #${id} removed.`,
      'Close',
      { duration: 2500 }
    );
  }

  heldOrderItemCount(order: HeldOrder): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  heldOrderTotal(order: HeldOrder): number {
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return Math.max(subtotal - this.heldOrderDiscount(order) + order.tax, 0);
  }

  discountConfig(): CheckoutDiscountConfig {
    return {
      percentageDiscount: this.normalizePercent(this.percentageDiscount),
      fixedDiscount: this.normalizeAmount(this.fixedDiscount),
      productDiscounts: this.cartItems()
        .filter((item) => this.normalizePercent(item.productDiscountPercent || 0) > 0)
        .map((item) => ({
          productId: item.productId,
          percentage: this.normalizePercent(item.productDiscountPercent || 0),
        })),
      categoryDiscount: {
        category: this.categoryDiscountCategory === 'All' ? '' : this.categoryDiscountCategory,
        percentage: this.normalizePercent(this.categoryDiscountPercent),
      },
      loyaltyPointsToRedeem: this.selectedCustomer()
        ? this.redeemableLoyaltyPoints()
        : 0,
      couponCode: this.appliedCoupon()?.code || '',
    };
  }

  private applyDiscountConfig(config?: CheckoutDiscountConfig): void {
    this.percentageDiscount = config?.percentageDiscount || 0;
    this.fixedDiscount = config?.fixedDiscount || 0;
    this.categoryDiscountCategory = config?.categoryDiscount?.category || 'All';
    this.categoryDiscountPercent = config?.categoryDiscount?.percentage || 0;
    this.loyaltyPointsToRedeem = config?.loyaltyPointsToRedeem || 0;
    this.couponCode = config?.couponCode || '';
    this.appliedCoupon.set(null);
  }

  private heldOrderDiscount(order: HeldOrder): number {
    if (!order.discountConfig) return order.discount || 0;

    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const productDiscount = order.items.reduce((sum, item) => {
      const percentage = Math.min(Math.max(Number(item.productDiscountPercent || 0), 0), 100);
      return sum + item.price * item.quantity * (percentage / 100);
    }, 0);
    const percentageDiscount = subtotal * ((order.discountConfig.percentageDiscount || 0) / 100);
    const categoryDiscount = order.discountConfig.categoryDiscount?.category
      ? order.items
        .filter((item) =>
          this.formatCategory(item.category || '') === order.discountConfig?.categoryDiscount.category
        )
        .reduce((sum, item) => sum + item.price * item.quantity, 0) *
          ((order.discountConfig.categoryDiscount.percentage || 0) / 100)
      : 0;

    return this.roundMoney(Math.min(
      productDiscount +
      percentageDiscount +
      (order.discountConfig.fixedDiscount || 0) +
      categoryDiscount,
      subtotal
    ));
  }

  clearCart(): void {
    this.saleService.clearCart();
    this.resetSaleInputs();
  }

  private resetSaleInputs(): void {
    this.selectedCustomerId = '';
    this.customerName = 'Walk-in';
    this.percentageDiscount = 0;
    this.fixedDiscount = 0;
    this.categoryDiscountCategory = 'All';
    this.categoryDiscountPercent = 0;
    this.loyaltyPointsToRedeem = 0;
    this.couponCode = '';
    this.appliedCoupon.set(null);
    this.discount = 0;
    this.tax = 0;
    this.splitCash = 0;
    this.splitCard = 0;
    this.splitMobile = 0;
    this.paymentMethod = 'cash';
  }

  private applyPayments(payments: PaymentEntry[]): void {
    this.splitCash = payments.find((payment) => payment.method === 'cash')?.amount || 0;
    this.splitCard = payments.find((payment) => payment.method === 'card')?.amount || 0;
    this.splitMobile = payments.find((payment) => payment.method === 'mobile')?.amount || 0;

    const entries = payments.filter((payment) => payment.amount > 0);
    this.paymentMethod = entries.length === 1 ? entries[0].method : 'cash';
  }

  onSearch(query: string): void {
    this.searchQuery = query;
  }

  stockStatus(product: Product): string {
    if (product.stock === 0) return 'Out';
    if (product.stock <= product.lowStockAlert) return 'Low';
    return 'In stock';
  }

  stockClass(product: Product): string {
    if (product.stock === 0) return 'out-stock';
    if (product.stock <= product.lowStockAlert) return 'low-stock';
    return 'in-stock';
  }

  checkout(): void {
    if (this.cartItems().length === 0) return;

    if (this.paidTotal() < this.total()) {
      this.snackBar.open(
        'Split payment total is less than the bill.',
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
        productDiscountPercent: this.normalizePercent(item.productDiscountPercent || 0),
      })),
      customerId: this.selectedCustomerId || undefined,
      discount: this.totalDiscount(),
      discounts: this.discountConfig(),
      tax: this.tax,
      paymentMethod: this.finalPaymentMethod(),
      payments: this.paymentEntries(),
      amountPaid: this.paidTotal(),
    };

    this.saleService.createSale(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.snackBar.open(
          `Sale completed. Invoice: ${res.sale?.invoiceNumber}`,
          'Close',
          { duration: 4000 }
        );
        this.clearCart();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(
          err.error?.message || 'Checkout failed.',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }
}
