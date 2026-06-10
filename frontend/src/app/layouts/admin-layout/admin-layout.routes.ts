import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-layout.component')
        .then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../../features/dashboard/dashboard.component')
            .then((m) => m.DashboardComponent),
      },
      {
        path: 'pos',
        loadComponent: () =>
          import('../../features/pos/pos.component')
            .then((m) => m.PosComponent),
      },
      {
        path: 'products',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'] },
        loadComponent: () =>
          import('../../features/products/products.component')
            .then((m) => m.ProductsComponent),
      },
      {
        path: 'suppliers',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'] },
        loadComponent: () =>
          import('../../features/suppliers/suppliers.component')
            .then((m) => m.SuppliersComponent),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('../../features/customers/customers.component')
            .then((m) => m.CustomersComponent),
      },
      {
        path: 'sales',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'] },
        loadComponent: () =>
          import('../../features/sales/sales.component')
            .then((m) => m.SalesComponent),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'] },
        loadComponent: () =>
          import('../../features/reports/reports.component')
            .then((m) => m.ReportsComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
