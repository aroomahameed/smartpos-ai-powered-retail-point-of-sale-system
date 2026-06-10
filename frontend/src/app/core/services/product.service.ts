import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  InventoryDashboard,
  InventoryHistoryResponse,
  InventoryMovementPayload,
  InventoryMovementResponse,
  Product,
  ProductResponse,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly API_URL = 'http://localhost:3000/api/products';
  private readonly INVENTORY_API_URL = 'http://localhost:3000/api/inventory';

  // 🔷 Signals
  products = signal<Product[]>([]);
  isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  // 🔷 Get all products
  getProducts(params?: any): Observable<ProductResponse> {
    this.isLoading.set(true);
    return this.http.get<ProductResponse>(this.API_URL, { params }).pipe(
      tap((res) => {
        this.products.set(res.products || []);
        this.isLoading.set(false);
      })
    );
  }

  // 🔷 Get product by id
  getProductById(id: string): Observable<{ product: Product }> {
    return this.http.get<{ product: Product }>(`${this.API_URL}/${id}`);
  }

  // 🔷 Create product
  createProduct(product: Partial<Product>): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(this.API_URL, product).pipe(
      tap((res) => {
        if (res.product) {
          this.products.update((prev) => [res.product!, ...prev]);
        }
      })
    );
  }

  // 🔷 Update product
  updateProduct(id: string, product: Partial<Product>): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${this.API_URL}/${id}`, product).pipe(
      tap((res) => {
        if (res.product) {
          this.products.update((prev) =>
            prev.map((p) => (p._id === id ? res.product! : p))
          );
        }
      })
    );
  }

  // 🔷 Delete product
  deleteProduct(id: string): Observable<ProductResponse> {
    return this.http.delete<ProductResponse>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        this.products.update((prev) => prev.filter((p) => p._id !== id));
      })
    );
  }

  getInventoryDashboard(): Observable<InventoryDashboard> {
    return this.http.get<InventoryDashboard>(`${this.INVENTORY_API_URL}/dashboard`);
  }

  getInventoryHistory(params?: any): Observable<InventoryHistoryResponse> {
    return this.http.get<InventoryHistoryResponse>(
      `${this.INVENTORY_API_URL}/history`,
      { params }
    );
  }

  createInventoryMovement(payload: InventoryMovementPayload): Observable<InventoryMovementResponse> {
    return this.http.post<InventoryMovementResponse>(
      `${this.INVENTORY_API_URL}/movements`,
      payload
    ).pipe(
      tap((res) => {
        this.products.update((prev) =>
          prev.map((product) =>
            product._id === res.product._id ? res.product : product
          )
        );
      })
    );
  }
}
