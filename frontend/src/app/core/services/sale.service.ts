import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Sale, SaleResponse, CartItem } from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly API_URL = 'http://localhost:3000/api/sales';

  // 🔷 Signals
  sales = signal<Sale[]>([]);
  isLoading = signal<boolean>(false);

  // 🔷 Cart Signals
  cart = signal<CartItem[]>([]);

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
}