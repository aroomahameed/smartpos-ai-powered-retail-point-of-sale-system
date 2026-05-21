import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./layouts/auth-layout/auth-layout.routes')
        .then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./layouts/admin-layout/admin-layout.routes')
        .then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./shared/components/unauthorized/unauthorized.component')
        .then((m) => m.UnauthorizedComponent),
  },
  { path: '**', redirectTo: 'auth/login' },
];