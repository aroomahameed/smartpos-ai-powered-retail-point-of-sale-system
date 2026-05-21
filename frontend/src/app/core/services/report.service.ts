import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface DashboardStats {
  today: { total: number; count: number };
  monthly: { total: number; count: number };
  totalProducts: number;
  totalCustomers: number;
  lowStockProducts: any[];
}

export interface SalesReport {
  salesByDay: {
    _id: string;
    total: number;
    count: number;
    profit: number;
  }[];
  paymentBreakdown: {
    _id: string;
    total: number;
    count: number;
  }[];
  topProducts: {
    _id: string;
    name: string;
    sku: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
}

export interface InventoryReport {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: any[];
  outOfStockProducts: any[];
  products: any[];
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly API_URL = 'http://localhost:3000/api/reports';

  // 🔷 Signals
  dashboardStats = signal<DashboardStats | null>(null);
  salesReport = signal<SalesReport | null>(null);
  inventoryReport = signal<InventoryReport | null>(null);
  isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  // 🔷 Get dashboard stats
  getDashboardStats(): Observable<{ stats: DashboardStats }> {
    this.isLoading.set(true);
    return this.http
      .get<{ stats: DashboardStats }>(`${this.API_URL}/dashboard`)
      .pipe(
        tap((res) => {
          this.dashboardStats.set(res.stats);
          this.isLoading.set(false);
        })
      );
  }

  // 🔷 Get sales report
  getSalesReport(params?: any): Observable<{ report: SalesReport }> {
    this.isLoading.set(true);
    return this.http
      .get<{ report: SalesReport }>(`${this.API_URL}/sales`, { params })
      .pipe(
        tap((res) => {
          this.salesReport.set(res.report);
          this.isLoading.set(false);
        })
      );
  }

  // 🔷 Get inventory report
  getInventoryReport(): Observable<{ report: InventoryReport }> {
    this.isLoading.set(true);
    return this.http
      .get<{ report: InventoryReport }>(`${this.API_URL}/inventory`)
      .pipe(
        tap((res) => {
          this.inventoryReport.set(res.report);
          this.isLoading.set(false);
        })
      );
  }
}