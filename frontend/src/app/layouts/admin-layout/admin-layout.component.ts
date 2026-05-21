import { Component, signal, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

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
          <mat-icon>point_of_sale</mat-icon>
          <span>POS System</span>
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
        <div class="logout">
          <button mat-stroked-button color="warn" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Logout
          </button>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content>

        <!-- Toolbar -->
        <mat-toolbar color="primary">
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
    .sidenav-container { height: 100vh; }

    .sidenav {
      width: 240px;
      background: #1a237e;
      color: white;
      display: flex;
      flex-direction: column;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px;
      font-size: 1.2rem;
      font-weight: bold;
      color: white;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    mat-nav-list { flex: 1; padding-top: 8px; }

    mat-list-item { color: rgba(255,255,255,0.8); border-radius: 8px; margin: 2px 8px; cursor: pointer; }
    mat-list-item:hover { background: rgba(255,255,255,0.1); color: white; }
    .active-link { background: rgba(255,255,255,0.2) !important; color: white !important; }

    .logout { padding: 16px; }

    .spacer { flex: 1; }

    .toolbar-title { font-size: 1.1rem; margin-left: 8px; }

    .content { padding: 24px; }
  `]
})
export class AdminLayoutComponent {
  private authService = inject(AuthService);

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
    { label: 'Customers', icon: 'people', route: 'customers', roles: ['admin', 'manager', 'cashier'] },
    { label: 'Sales', icon: 'receipt_long', route: 'sales', roles: ['admin', 'manager'] },
    { label: 'Reports', icon: 'bar_chart', route: 'reports', roles: ['admin', 'manager'] },
  ];

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