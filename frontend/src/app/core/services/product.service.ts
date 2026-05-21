import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Product, ProductResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly API_URL = 'http://localhost:3000/api/products';

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
}