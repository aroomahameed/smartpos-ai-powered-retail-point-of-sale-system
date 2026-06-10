import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  Customer,
  CustomerProfileResponse,
  CustomerResponse,
} from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly API_URL = 'http://localhost:3000/api/customers';

  // 🔷 Signals
  customers = signal<Customer[]>([]);
  isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  // 🔷 Get all customers
  getCustomers(params?: any): Observable<CustomerResponse> {
    this.isLoading.set(true);
    return this.http.get<CustomerResponse>(this.API_URL, { params }).pipe(
      tap((res) => {
        this.customers.set(res.customers || []);
        this.isLoading.set(false);
      })
    );
  }

  // 🔷 Get customer by id
  getCustomerById(id: string): Observable<{ customer: Customer }> {
    return this.http.get<{ customer: Customer }>(`${this.API_URL}/${id}`);
  }

  getCustomerProfile(id: string): Observable<CustomerProfileResponse> {
    return this.http.get<CustomerProfileResponse>(`${this.API_URL}/${id}/profile`);
  }

  // 🔷 Create customer
  createCustomer(customer: Partial<Customer>): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>(this.API_URL, customer).pipe(
      tap((res) => {
        if (res.customer) {
          this.customers.update((prev) => [res.customer!, ...prev]);
        }
      })
    );
  }

  // 🔷 Update customer
  updateCustomer(id: string, customer: Partial<Customer>): Observable<CustomerResponse> {
    return this.http.put<CustomerResponse>(`${this.API_URL}/${id}`, customer).pipe(
      tap((res) => {
        if (res.customer) {
          this.customers.update((prev) =>
            prev.map((c) => (c._id === id ? res.customer! : c))
          );
        }
      })
    );
  }

  // 🔷 Delete customer
  deleteCustomer(id: string): Observable<CustomerResponse> {
    return this.http.delete<CustomerResponse>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        this.customers.update((prev) => prev.filter((c) => c._id !== id));
      })
    );
  }
}
