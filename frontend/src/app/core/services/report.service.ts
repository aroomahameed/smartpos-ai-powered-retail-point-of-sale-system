import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface DashboardStats {
  today: { total: number; count: number; profit: number };
  monthly: { total: number; count: number };
  totalOrders: number;
  totalCustomers: number;
  pendingReturns: number;
  lowStockCount: number;
  lowStockProducts: any[];
  expiringSoonCount?: number;
  expiringSoonProducts?: any[];
  topSellingProduct: {
    _id: string;
    name: string;
    sku: string;
    totalQuantity: number;
    totalRevenue: number;
  } | null;
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

export interface AnalyticsReport {
  summary: {
    revenue: number;
    orders: number;
    profit: number;
    discount: number;
    tax: number;
    refundAmount: number;
    returns: number;
    inventoryValue: number;
    lowStockCount: number;
  };
  dailySales: any[];
  monthlySales: any[];
  profitReport: any[];
  categorySales: any[];
  productSales: any[];
  cashierSales: any[];
  customerSales: any[];
  inventoryReport: any;
  lowStockReport: any[];
  refundReport: {
    summary: any;
    reasons: any[];
    methods: any[];
  };
  discountReport: {
    byType: any[];
    coupons: any[];
  };
  taxReport: any[];
  paymentMethodReport: any[];
  stockMovement: any[];
  insights: string[];
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly API_URL = 'http://localhost:3000/api/reports';

  // 🔷 Signals
  dashboardStats = signal<DashboardStats | null>(null);
  salesReport = signal<SalesReport | null>(null);
  inventoryReport = signal<InventoryReport | null>(null);
  analyticsReport = signal<AnalyticsReport | null>(null);
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

  getAnalyticsReport(params?: any): Observable<{ report: AnalyticsReport }> {
    this.isLoading.set(true);
    return this.http
      .get<{ report: AnalyticsReport }>(`${this.API_URL}/analytics`, { params })
      .pipe(
        tap((res) => {
          this.analyticsReport.set(res.report);
          this.isLoading.set(false);
        })
      );
  }
}
