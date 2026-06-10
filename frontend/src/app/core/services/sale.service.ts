import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  CartItem,
  CouponValidationResponse,
  CreateReturnPayload,
  CreateReturnResponse,
  HeldOrder,
  ReturnInvoiceResponse,
  Sale,
  SaleResponse,
} from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly API_URL = 'http://localhost:3000/api/sales';
  private readonly RETURNS_API_URL = 'http://localhost:3000/api/returns';
  private readonly COUPONS_API_URL = 'http://localhost:3000/api/coupons';
  private readonly HELD_ORDERS_KEY = 'pos_held_orders';
  private readonly HELD_ORDER_SEQUENCE_KEY = 'pos_held_order_sequence';

  // 🔷 Signals
  sales = signal<Sale[]>([]);
  isLoading = signal<boolean>(false);

  // 🔷 Cart Signals
  cart = signal<CartItem[]>([]);
  heldOrders = signal<HeldOrder[]>(this.loadHeldOrders());

  constructor(private http: HttpClient) {}

  // 🔷 Cart Operations
  addToCart(item: CartItem): void {
    this.cart.update((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  removeFromCart(productId: string): void {
    this.cart.update((prev) =>
      prev.filter((i) => i.productId !== productId)
    );
  }

  updateCartItemQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    this.cart.update((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      )
    );
  }

  clearCart(): void {
    this.cart.set([]);
  }

  setCart(items: CartItem[]): void {
    this.cart.set(items.map((item) => ({ ...item })));
  }

  holdOrder(order: Omit<HeldOrder, 'id' | 'createdAt'>): HeldOrder {
    const heldOrder: HeldOrder = {
      ...order,
      id: this.nextHeldOrderId(),
      items: order.items.map((item) => ({ ...item })),
      createdAt: new Date().toISOString(),
    };

    this.heldOrders.update((orders) => {
      const next = [heldOrder, ...orders];
      this.saveHeldOrders(next);
      return next;
    });

    this.clearCart();
    return heldOrder;
  }

  resumeHeldOrder(id: number): HeldOrder | null {
    const order = this.heldOrders().find((item) => item.id === id);
    if (!order) return null;

    this.setCart(order.items);
    this.deleteHeldOrder(id);
    return order;
  }

  deleteHeldOrder(id: number): void {
    this.heldOrders.update((orders) => {
      const next = orders.filter((order) => order.id !== id);
      this.saveHeldOrders(next);
      return next;
    });
  }

  private loadHeldOrders(): HeldOrder[] {
    const stored = localStorage.getItem(this.HELD_ORDERS_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored) as HeldOrder[];
    } catch {
      return [];
    }
  }

  private saveHeldOrders(orders: HeldOrder[]): void {
    localStorage.setItem(this.HELD_ORDERS_KEY, JSON.stringify(orders));
  }

  private nextHeldOrderId(): number {
    const stored = Number(localStorage.getItem(this.HELD_ORDER_SEQUENCE_KEY));
    const next = Number.isFinite(stored) && stored >= 1023 ? stored + 1 : 1023;
    localStorage.setItem(this.HELD_ORDER_SEQUENCE_KEY, String(next));
    return next;
  }

  // 🔷 Get all sales
  getSales(params?: any): Observable<SaleResponse> {
    this.isLoading.set(true);
    return this.http.get<SaleResponse>(this.API_URL, { params }).pipe(
      tap((res) => {
        this.sales.set(res.sales || []);
        this.isLoading.set(false);
      })
    );
  }

  // 🔷 Get sale by id
  getSaleById(id: string): Observable<{ sale: Sale }> {
    return this.http.get<{ sale: Sale }>(`${this.API_URL}/${id}`);
  }

  // 🔷 Create sale
  createSale(payload: any): Observable<SaleResponse> {
    return this.http.post<SaleResponse>(this.API_URL, payload).pipe(
      tap((res) => {
        if (res.sale) {
          this.sales.update((prev) => [res.sale!, ...prev]);
          this.clearCart();
        }
      })
    );
  }

  // 🔷 Refund sale
  refundSale(id: string): Observable<SaleResponse> {
    return this.http.put<SaleResponse>(
      `${this.API_URL}/${id}/refund`, {}
    ).pipe(
      tap((res) => {
        if (res.sale) {
          this.sales.update((prev) =>
            prev.map((s) => (s._id === id ? res.sale! : s))
          );
        }
      })
    );
  }

  updateCartItemDiscount(productId: string, productDiscountPercent: number): void {
    const discount = Math.min(Math.max(Number(productDiscountPercent || 0), 0), 100);
    this.cart.update((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, productDiscountPercent: discount } : i
      )
    );
  }

  validateCoupon(code: string, subtotal: number): Observable<CouponValidationResponse> {
    return this.http.post<CouponValidationResponse>(
      `${this.COUPONS_API_URL}/validate`,
      { code, subtotal }
    );
  }

  searchReturnInvoice(invoiceNumber: string): Observable<ReturnInvoiceResponse> {
    return this.http.get<ReturnInvoiceResponse>(
      `${this.RETURNS_API_URL}/invoice/${encodeURIComponent(invoiceNumber)}`
    );
  }

  createReturn(payload: CreateReturnPayload): Observable<CreateReturnResponse> {
    return this.http.post<CreateReturnResponse>(this.RETURNS_API_URL, payload).pipe(
      tap((res) => {
        this.sales.update((prev) =>
          prev.map((sale) => sale._id === res.sale._id ? res.sale : sale)
        );
      })
    );
  }
}
