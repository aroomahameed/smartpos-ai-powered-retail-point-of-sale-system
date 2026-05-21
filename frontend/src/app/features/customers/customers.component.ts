import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomerService } from '../../core/services/customer.service';
import { Customer } from '../../core/models/customer.model';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="customers-container">

      <!-- Header -->
      <div class="page-header">
        <h1>
          <mat-icon>people</mat-icon>
          Customers
        </h1>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>person_add</mat-icon>
          Add Customer
        </button>
      </div>

      <!-- Search -->
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search customers</mat-label>
        <input matInput [(ngModel)]="searchQuery"
          placeholder="Search by name, phone or email..."/>
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <!-- Form -->
      @if (showForm()) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>
              {{ editingCustomer() ? 'Edit Customer' : 'Add New Customer' }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="customerForm" (ngSubmit)="onSubmit()">
              <div class="form-grid">

                <mat-form-field appearance="outline">
                  <mat-label>Full Name</mat-label>
                  <input matInput formControlName="name"/>
                  @if (customerForm.get('name')?.hasError('required') &&
                       customerForm.get('name')?.touched) {
                    <mat-error>Name is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone"/>
                  @if (customerForm.get('phone')?.hasError('required') &&
                       customerForm.get('phone')?.touched) {
                    <mat-error>Phone is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Address</mat-label>
                  <input matInput formControlName="address"/>
                </mat-form-field>

              </div>

              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="closeForm()">
                  Cancel
                </button>
                <button mat-raised-button color="primary" type="submit"
                  [disabled]="customerForm.invalid || isLoading()">
                  @if (isLoading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    {{ editingCustomer() ? 'Update' : 'Create' }}
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <!-- Table -->
      @if (customerService.isLoading()) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <mat-card>
          <table mat-table [dataSource]="filteredCustomers()" class="customers-table">

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let c">
                <div class="customer-name-cell">
                  <strong>{{ c.name }}</strong>
                  <span>{{ c.email }}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Phone</th>
              <td mat-cell *matCellDef="let c">{{ c.phone }}</td>
            </ng-container>

            <ng-container matColumnDef="loyaltyPoints">
              <th mat-header-cell *matHeaderCellDef>Loyalty Points</th>
              <td mat-cell *matCellDef="let c">
                <span class="points-badge">
                  <mat-icon>stars</mat-icon>
                  {{ c.loyaltyPoints }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="totalPurchases">
              <th mat-header-cell *matHeaderCellDef>Total Purchases</th>
              <td mat-cell *matCellDef="let c">
                {{ c.totalPurchases | currency }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let c">
                <button mat-icon-button color="primary" (click)="editCustomer(c)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteCustomer(c._id)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          </table>

          @if (filteredCustomers().length === 0) {
            <div class="no-data">
              <mat-icon>people</mat-icon>
              <p>No customers found</p>
            </div>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .customers-container { padding: 8px; }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.5rem;
    }

    .search-field { width: 100%; margin-bottom: 16px; }

    .form-card { margin-bottom: 16px; }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .customers-table { width: 100%; }

    .customer-name-cell {
      display: flex;
      flex-direction: column;
    }

    .customer-name-cell span { color: #999; font-size: 0.8rem; }

    .points-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #f57f17;
      font-weight: 600;
    }

    .points-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .loading { display: flex; justify-content: center; padding: 48px; }

    .no-data {
      text-align: center;
      padding: 48px;
      color: #999;
    }

    .no-data mat-icon { font-size: 48px; width: 48px; height: 48px; }
  `]
})
export class CustomersComponent implements OnInit {
  customerService = inject(CustomerService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // 🔷 Signals
  showForm = signal<boolean>(false);
  editingCustomer = signal<Customer | null>(null);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  displayedColumns = ['name', 'phone', 'loyaltyPoints', 'totalPurchases', 'actions'];

  // 🔷 Form
  customerForm: FormGroup = this.fb.group({
    name:    ['', Validators.required],
    phone:   ['', Validators.required],
    email:   [''],
    address: [''],
  });

  // 🔷 Computed
  filteredCustomers = computed(() =>
    this.customerService.customers().filter((c) =>
      c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      c.phone.includes(this.searchQuery) ||
      c.email?.toLowerCase().includes(this.searchQuery.toLowerCase())
    )
  );

  ngOnInit(): void {
    this.customerService.getCustomers().subscribe();
  }

  openForm(): void {
    this.showForm.set(true);
    this.editingCustomer.set(null);
    this.customerForm.reset();
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingCustomer.set(null);
    this.customerForm.reset();
  }

  editCustomer(customer: Customer): void {
    this.editingCustomer.set(customer);
    this.showForm.set(true);
    this.customerForm.patchValue(customer);
  }

  onSubmit(): void {
    if (this.customerForm.invalid) return;
    this.isLoading.set(true);

    const editing = this.editingCustomer();

    const request$ = editing
      ? this.customerService.updateCustomer(editing._id, this.customerForm.value)
      : this.customerService.createCustomer(this.customerForm.value);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open(
          `✅ Customer ${editing ? 'updated' : 'created'} successfully!`,
          'Close',
          { duration: 3000 }
        );
        this.closeForm();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(
          err.error?.message || '❌ Operation failed!',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }

  deleteCustomer(id: string): void {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    this.customerService.deleteCustomer(id).subscribe({
      next: () => {
        this.snackBar.open('✅ Customer deleted!', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('❌ Delete failed!', 'Close', { duration: 3000 });
      },
    });
  }
}