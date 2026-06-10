import { Component, signal, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { filter } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    CommonModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">

      <!-- Sidebar -->
      <mat-sidenav
        #sidenav
        mode="side"
        [opened]="sidenavOpen()"
        class="sidenav">

        <!-- Logo -->
        <div class="logo">
          <div class="logo-icon">
            <mat-icon>point_of_sale</mat-icon>
          </div>
          <div>
            <span>RetailOS</span>
            <small>Advanced POS</small>
          </div>
        </div>

        <!-- Nav Items -->
    <mat-nav-list>
          @for (item of visibleNavItems(); track item.route) {
            <mat-list-item
              [routerLink]="item.route"
              routerLinkActive="active-link"
              (click)="onNavClick()">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </mat-list-item>
          }
        </mat-nav-list>

        <!-- Logout -->
        <div class="sidebar-footer">
          <div class="role-pill">
            <mat-icon>verified_user</mat-icon>
            {{ userRole() | titlecase }}
          </div>
          <button mat-stroked-button (click)="logout()">
            <mat-icon>logout</mat-icon>
            Logout
          </button>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content>

        <!-- Toolbar -->
        <mat-toolbar>
          <button mat-icon-button (click)="toggleSidenav()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-title">{{ pageTitle() }}</span>
          <span class="spacer"></span>

          <!-- User Menu -->
          <button mat-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
            {{ userName() }}
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item disabled>
              <mat-icon>badge</mat-icon>
              {{ userRole() | titlecase }}
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              Logout
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- Page Content -->
        <div class="content">
          <router-outlet></router-outlet>
        </div>

      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
      background:
        linear-gradient(180deg, rgba(15,143,120,0.08), transparent 260px),
        var(--app-bg);
    }

    .sidenav {
      width: 268px;
      border-right: 0;
      background:
        linear-gradient(180deg, var(--app-sidebar) 0%, var(--app-sidebar-2) 100%);
      color: white;
      display: flex;
      flex-direction: column;
      box-shadow: 18px 0 40px rgba(16, 24, 39, 0.18);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 86px;
      padding: 18px 18px;
      color: white;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background:
        linear-gradient(135deg, rgba(15,143,120,0.22), transparent 68%);
    }

    .logo-icon {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: rgba(15,143,120,0.22);
      color: #6ee7ce;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
    }

    .logo span {
      display: block;
      font-size: 1.12rem;
      font-weight: 900;
      letter-spacing: 0;
    }

    .logo small {
      display: block;
      margin-top: 2px;
      color: rgba(255,255,255,0.62);
      font-size: 0.74rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    mat-nav-list {
      flex: 1;
      padding: 14px 10px;
    }

    mat-list-item {
      height: 48px !important;
      color: #ffffff !important;
      border-radius: 12px;
      margin: 4px 0;
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease, transform 160ms ease;
    }

    mat-list-item:hover {
      background: rgba(255,255,255,0.08);
      color: #ffffff !important;
      transform: translateX(2px);
    }

    mat-list-item mat-icon {
      color: #ffffff !important;
    }

    mat-list-item span,
    mat-list-item .mdc-list-item__primary-text {
      color: #ffffff !important;
    }

    .active-link {
      background: linear-gradient(135deg, rgba(15,143,120,0.96), rgba(37,93,168,0.82)) !important;
      color: #ffffff !important;
      box-shadow: 0 12px 26px rgba(15, 143, 120, 0.26);
    }

    .active-link mat-icon {
      color: white !important;
    }

    .sidebar-footer {
      display: grid;
      gap: 10px;
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    .sidebar-footer button {
      justify-content: flex-start;
      border-color: rgba(255,255,255,0.18);
      color: rgba(255,255,255,0.82);
      border-radius: 10px;
    }

    .role-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(217, 139, 24, 0.14);
      color: #f3be6f;
      font-size: 0.78rem;
      font-weight: 900;
    }

    mat-toolbar {
      height: 66px;
      color: var(--app-ink);
      background: rgba(255,255,255,0.86);
      border-bottom: 1px solid var(--app-border);
      box-shadow: 0 8px 24px rgba(16, 24, 39, 0.06);
      backdrop-filter: blur(12px);
    }

    .spacer { flex: 1; }

    .toolbar-title {
      font-size: 1.08rem;
      font-weight: 900;
      margin-left: 10px;
      color: var(--app-ink);
    }

    mat-toolbar button {
      color: var(--app-ink);
    }

    .content {
      min-height: calc(100vh - 66px);
      padding: 24px;
      background:
        linear-gradient(180deg, rgba(15,143,120,0.08), transparent 240px),
        var(--app-bg);
      overflow: auto;
    }

    @media (max-width: 820px) {
      .sidenav {
        width: 250px;
      }

      .content {
        padding: 16px;
      }
    }
  `]
})
export class AdminLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // 🔷 Signals
  sidenavOpen = signal<boolean>(true);
  currentRoute = signal<string>('');

  // 🔷 Computed Signals
  userName = computed(() => this.authService.userName());
  userRole = computed(() => this.authService.userRole());

  pageTitle = computed(() => {
    const route = this.currentRoute();
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      pos: 'Point of Sale',
      products: 'Products',
      suppliers: 'Suppliers & Purchases',
      customers: 'Customers',
      sales: 'Sales History',
      reports: 'Reports',
    };
    return titles[route] || 'POS System';
  });

  visibleNavItems = computed(() => {
    const role = this.userRole() || '';
    return this.navItems.filter((item) => item.roles.includes(role));
  });

  // Nav Items
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: 'dashboard', roles: ['admin', 'manager', 'cashier'] },
    { label: 'POS', icon: 'point_of_sale', route: 'pos', roles: ['admin', 'manager', 'cashier'] },
    { label: 'Products', icon: 'inventory_2', route: 'products', roles: ['admin', 'manager'] },
    { label: 'Suppliers', icon: 'local_shipping', route: 'suppliers', roles: ['admin', 'manager'] },
    { label: 'Customers', icon: 'people', route: 'customers', roles: ['admin', 'manager', 'cashier'] },
    { label: 'Sales', icon: 'receipt_long', route: 'sales', roles: ['admin', 'manager'] },
    { label: 'Reports', icon: 'bar_chart', route: 'reports', roles: ['admin', 'manager'] },
  ];

  constructor() {
    this.setCurrentRoute(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.setCurrentRoute(event.urlAfterRedirects));
  }

  private setCurrentRoute(url: string): void {
    const segment = url.split('?')[0].split('/').filter(Boolean).pop() || 'dashboard';
    this.currentRoute.set(segment);
  }

  toggleSidenav(): void {
    this.sidenavOpen.update((v) => !v);
  }

  onNavClick(): void {
    if (window.innerWidth < 768) {
      this.sidenavOpen.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
