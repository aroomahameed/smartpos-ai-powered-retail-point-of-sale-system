import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api/auth';

  // 🔷 Signals
  private currentUser = signal<User | null>(this.loadUserFromStorage());

  // 🔷 Computed Signals
  isLoggedIn = computed(() => !!this.currentUser());
  userRole = computed(() => this.currentUser()?.role);
  userName = computed(() => this.currentUser()?.name);
  userToken = computed(() => this.currentUser()?.token);

  constructor(private http: HttpClient, private router: Router) {}

  // Load user from localStorage on app start
  private loadUserFromStorage(): User | null {
    const stored = localStorage.getItem('pos_user');
    return stored ? JSON.parse(stored) : null;
  }

  // 🔷 Login
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => {
        const user: User = { ...response.user, token: response.token };
        this.currentUser.set(user);
        localStorage.setItem('pos_user', JSON.stringify(user));
      })
    );
  }

  // 🔷 Register
  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, credentials).pipe(
      tap((response) => {
        const user: User = { ...response.user, token: response.token };
        this.currentUser.set(user);
        localStorage.setItem('pos_user', JSON.stringify(user));
      })
    );
  }

  // 🔷 Logout
  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('pos_user');
    this.router.navigate(['/auth/login']);
  }

  // 🔷 Get current user
  getUser(): User | null {
    return this.currentUser();
  }

  // 🔷 Check role
  hasRole(...roles: string[]): boolean {
    const role = this.userRole();
    return role ? roles.includes(role) : false;
  }
}