import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  CreatePurchaseOrderPayload,
  PurchaseOrder,
  PurchaseOrderResponse,
  Supplier,
  SupplierPaymentStatus,
  SupplierProfileResponse,
  SupplierResponse,
} from '../models/supplier.model';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly API_URL = 'http://localhost:3000/api/suppliers';

  suppliers = signal<Supplier[]>([]);
  isLoading = signal<boolean>(false);
  purchaseOrders = signal<PurchaseOrder[]>([]);

  constructor(private http: HttpClient) {}

  getSuppliers(params?: any): Observable<SupplierResponse> {
    this.isLoading.set(true);
    return this.http.get<SupplierResponse>(this.API_URL, { params }).pipe(
      tap((res) => {
        this.suppliers.set(res.suppliers || []);
        this.isLoading.set(false);
      })
    );
  }

  getSupplierProfile(id: string): Observable<SupplierProfileResponse> {
    return this.http.get<SupplierProfileResponse>(`${this.API_URL}/${id}/profile`);
  }

  createSupplier(supplier: Partial<Supplier>): Observable<SupplierResponse> {
    return this.http.post<SupplierResponse>(this.API_URL, supplier).pipe(
      tap((res) => {
        if (res.supplier) {
          this.suppliers.update((prev) => [res.supplier!, ...prev]);
        }
      })
    );
  }

  updateSupplier(id: string, supplier: Partial<Supplier>): Observable<SupplierResponse> {
    return this.http.put<SupplierResponse>(`${this.API_URL}/${id}`, supplier).pipe(
      tap((res) => {
        if (res.supplier) {
          this.suppliers.update((prev) =>
            prev.map((item) => item._id === id ? res.supplier! : item)
          );
        }
      })
    );
  }

  deleteSupplier(id: string): Observable<SupplierResponse> {
    return this.http.delete<SupplierResponse>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        this.suppliers.update((prev) => prev.filter((item) => item._id !== id));
      })
    );
  }

  getPurchaseOrders(params?: any): Observable<PurchaseOrderResponse> {
    return this.http.get<PurchaseOrderResponse>(
      `${this.API_URL}/purchase-orders`,
      { params }
    ).pipe(
      tap((res) => {
        this.purchaseOrders.set(res.purchaseOrders || []);
      })
    );
  }

  createPurchaseOrder(payload: CreatePurchaseOrderPayload): Observable<PurchaseOrderResponse> {
    return this.http.post<PurchaseOrderResponse>(
      `${this.API_URL}/purchase-orders`,
      payload
    ).pipe(
      tap((res) => {
        if (res.purchaseOrder) {
          this.purchaseOrders.update((prev) => [res.purchaseOrder!, ...prev]);
        }
      })
    );
  }

  receivePurchaseOrder(id: string): Observable<PurchaseOrderResponse> {
    return this.http.put<PurchaseOrderResponse>(
      `${this.API_URL}/purchase-orders/${id}/receive`,
      {}
    ).pipe(
      tap((res) => this.replacePurchaseOrder(id, res))
    );
  }

  updatePaymentStatus(
    id: string,
    paidAmount: number,
    paymentStatus?: SupplierPaymentStatus
  ): Observable<PurchaseOrderResponse> {
    return this.http.put<PurchaseOrderResponse>(
      `${this.API_URL}/purchase-orders/${id}/payment`,
      { paidAmount, paymentStatus }
    ).pipe(
      tap((res) => this.replacePurchaseOrder(id, res))
    );
  }

  private replacePurchaseOrder(id: string, res: PurchaseOrderResponse): void {
    if (!res.purchaseOrder) return;

    this.purchaseOrders.update((prev) =>
      prev.map((item) => item._id === id ? res.purchaseOrder! : item)
    );
  }
}
