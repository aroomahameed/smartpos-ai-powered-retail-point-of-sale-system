import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { CustomerService } from '../../core/services/customer.service';
import {
  Customer,
  CustomerProfileResponse,
  CustomerType,
} from '../../core/models/customer.model';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  template: `
    <div class="customers-shell">
      <section class="customers-hero">
        <div>
          <p class="eyebrow">Customer and loyalty system</p>
          <h1>
            <mat-icon>people</mat-icon>
            Customers
          </h1>
        </div>
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>person_add</mat-icon>
          Add Customer
        </button>
      </section>

      <section class="summary-grid">
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>groups</mat-icon>
            <div>
              <span>Total Customers</span>
              <strong>{{ customerService.customers().length }}</strong>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>stars</mat-icon>
            <div>
              <span>Loyalty Points</span>
              <strong>{{ totalLoyaltyPoints() | number }}</strong>
              <small>100 points = Rs. 5 discount</small>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>account_balance_wallet</mat-icon>
            <div>
              <span>Credit Balance</span>
              <strong>{{ totalCreditBalance() | currency }}</strong>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card">
          <mat-card-content>
            <mat-icon>payments</mat-icon>
            <div>
              <span>Total Spending</span>
              <strong>{{ totalSpending() | currency }}</strong>
            </div>
          </mat-card-content>
        </mat-card>
      </section>

      @if (selectedProfile()) {
        <mat-card class="profile-card">
          <mat-card-header>
            <mat-icon>badge</mat-icon>
            <div>
              <mat-card-title>{{ selectedProfile()?.customer?.name }}</mat-card-title>
              <mat-card-subtitle>
                {{ customerTypeLabel(selectedProfile()?.summary?.customerType) }}
              </mat-card-subtitle>
            </div>
            <button mat-icon-button (click)="selectedProfile.set(null)">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="profile-metrics">
              <div>
                <span>Total spending</span>
                <strong>{{ selectedProfile()?.summary?.totalSpending || 0 | currency }}</strong>
              </div>
              <div>
                <span>Last purchase</span>
                <strong>{{ selectedProfile()?.summary?.lastPurchaseDate ? (selectedProfile()?.summary?.lastPurchaseDate | date:'mediumDate') : 'No purchases' }}</strong>
              </div>
              <div>
                <span>Loyalty points</span>
                <strong>{{ selectedProfile()?.summary?.loyaltyPoints || 0 | number }}</strong>
              </div>
              <div>
                <span>Redeem value</span>
                <strong>{{ selectedProfile()?.summary?.loyaltyDiscountValue || 0 | currency }}</strong>
              </div>
              <div>
                <span>Credit balance</span>
                <strong>{{ selectedProfile()?.summary?.creditBalance || 0 | currency }}</strong>
              </div>
            </div>

            <div class="profile-columns">
              <section>
                <h3>Favorite Products</h3>
                @if (selectedProfile()?.favoriteProducts?.length) {
                  <div class="mini-list">
                    @for (product of selectedProfile()?.favoriteProducts || []; track product._id) {
                      <div>
                        <span>{{ product.name }}</span>
                        <strong>{{ product.quantity }} sold</strong>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="muted">No favorite products yet</p>
                }
              </section>

              <section>
                <h3>Purchase History</h3>
                @if (selectedProfile()?.purchaseHistory?.length) {
                  <div class="mini-list purchase-list">
                    @for (sale of selectedProfile()?.purchaseHistory || []; track sale._id) {
                      <div>
                        <span>{{ sale.invoiceNumber }} - {{ sale.createdAt | date:'mediumDate' }}</span>
                        <strong>{{ sale.total | currency }}</strong>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="muted">No purchase history yet</p>
                }
              </section>
            </div>
          </mat-card-content>
        </mat-card>
      }

      @if (showForm()) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>{{ editingCustomer() ? 'Edit Customer Profile' : 'Add Customer Profile' }}</mat-card-title>
            <mat-card-subtitle>Customer type, credit balance, and loyalty settings</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="customerForm" (ngSubmit)="onSubmit()">
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Full Name</mat-label>
                  <input matInput formControlName="name"/>
                  @if (customerForm.get('name')?.hasError('required') && customerForm.get('name')?.touched) {
                    <mat-error>Name is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone"/>
                  @if (customerForm.get('phone')?.hasError('required') && customerForm.get('phone')?.touched) {
                    <mat-error>Phone is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Customer Type</mat-label>
                  <mat-select formControlName="customerType">
                    @for (type of customerTypes; track type.value) {
                      <mat-option [value]="type.value">{{ type.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Credit Balance</mat-label>
                  <input matInput type="number" formControlName="creditBalance"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Loyalty Points</mat-label>
                  <input matInput type="number" formControlName="loyaltyPoints"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Total Spending</mat-label>
                  <input matInput type="number" formControlName="totalPurchases"/>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Last Purchase Date</mat-label>
                  <input matInput type="date" formControlName="lastPurchaseDate"/>
                </mat-form-field>

                <mat-form-field appearance="outline" class="address-field">
                  <mat-label>Address</mat-label>
                  <input matInput formControlName="address"/>
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="closeForm()">Cancel</button>
                <button mat-flat-button color="primary" type="submit"
                  [disabled]="customerForm.invalid || isLoading()">
                  @if (isLoading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    {{ editingCustomer() ? 'Update Profile' : 'Create Profile' }}
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search customers</mat-label>
        <input matInput [(ngModel)]="searchQuery" placeholder="Search by name, phone, email, or type..."/>
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      @if (customerService.isLoading()) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <mat-card class="table-card">
          <mat-card-content>
            @if (filteredCustomers().length) {
              <div class="table-wrap">
                <table mat-table [dataSource]="filteredCustomers()" class="customers-table">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Customer</th>
                    <td mat-cell *matCellDef="let c">
                      <div class="customer-name-cell">
                        <strong>{{ c.name }}</strong>
                        <span>{{ c.email || c.phone }}</span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="type">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let c">
                      <mat-chip>{{ customerTypeLabel(c.customerType) }}</mat-chip>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="loyaltyPoints">
                    <th mat-header-cell *matHeaderCellDef>Loyalty</th>
                    <td mat-cell *matCellDef="let c">
                      <span class="points-badge">
                        <mat-icon>stars</mat-icon>
                        {{ c.loyaltyPoints || 0 }}
                      </span>
                      <small>{{ loyaltyValue(c) | currency }} redeemable</small>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="totalPurchases">
                    <th mat-header-cell *matHeaderCellDef>Total Spending</th>
                    <td mat-cell *matCellDef="let c">{{ c.totalPurchases || 0 | currency }}</td>
                  </ng-container>

                  <ng-container matColumnDef="lastPurchase">
                    <th mat-header-cell *matHeaderCellDef>Last Purchase</th>
                    <td mat-cell *matCellDef="let c">
                      {{ c.lastPurchaseDate ? (c.lastPurchaseDate | date:'mediumDate') : '-' }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="creditBalance">
                    <th mat-header-cell *matHeaderCellDef>Credit</th>
                    <td mat-cell *matCellDef="let c">{{ c.creditBalance || 0 | currency }}</td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let c">
                      <button mat-icon-button color="primary" (click)="viewProfile(c)">
                        <mat-icon>visibility</mat-icon>
                      </button>
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
              </div>
            } @else {
              <div class="no-data">
                <mat-icon>people</mat-icon>
                <p>No customers found</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .customers-shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: #172033;
    }

    .customers-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px;
      border: 1px solid #e7edf3;
      border-radius: 16px;
      background: white;
      box-shadow: 0 12px 30px rgba(25, 45, 70, 0.08);
    }

    .eyebrow {
      margin: 0 0 5px;
      color: #718093;
      font-size: 0.78rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 1.55rem;
      font-weight: 900;
      letter-spacing: 0;
    }

    .summary-grid,
    .profile-metrics,
    .profile-columns,
    .form-grid {
      display: grid;
      gap: 12px;
    }

    .summary-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .summary-card,
    .profile-card,
    .form-card,
    .table-card {
      border: 1px solid #e7edf3;
      border-radius: 12px !important;
      box-shadow: 0 10px 24px rgba(25, 45, 70, 0.07) !important;
    }

    .summary-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px !important;
    }

    .summary-card mat-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #eef7f4;
      color: #16665c;
      font-size: 26px;
    }

    .summary-card span,
    .summary-card small,
    .muted,
    td small {
      color: #718093;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .summary-card strong {
      display: block;
      margin-top: 2px;
      font-size: 1.35rem;
      font-weight: 900;
    }

    mat-card-header {
      align-items: center;
      gap: 10px;
      padding-bottom: 8px;
    }

    mat-card-header > button {
      margin-left: auto;
    }

    .profile-metrics {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      margin-bottom: 16px;
    }

    .profile-metrics div {
      display: grid;
      gap: 4px;
      padding: 12px;
      border: 1px solid #edf1f5;
      border-radius: 10px;
      background: #fbfcfe;
    }

    .profile-metrics span {
      color: #718093;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .profile-metrics strong {
      font-size: 1rem;
      font-weight: 900;
    }

    .profile-columns {
      grid-template-columns: 1fr 1.4fr;
    }

    .profile-columns h3 {
      margin: 0 0 8px;
      font-size: 0.95rem;
      font-weight: 900;
    }

    .mini-list {
      display: grid;
      gap: 8px;
      max-height: 240px;
      overflow-y: auto;
    }

    .mini-list div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 10px;
      border: 1px solid #edf1f5;
      border-radius: 10px;
      background: #fbfcfe;
    }

    .form-grid {
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      margin-top: 12px;
    }

    .address-field {
      grid-column: span 2;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: -18px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
    }

    .search-field {
      width: 100%;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .customers-table {
      width: 100%;
      min-width: 940px;
    }

    .customer-name-cell {
      display: flex;
      flex-direction: column;
    }

    .customer-name-cell span {
      color: #718093;
      font-size: 0.8rem;
    }

    .points-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #9a6400;
      font-weight: 900;
    }

    .points-badge mat-icon {
      width: 17px;
      height: 17px;
      font-size: 17px;
    }

    mat-chip {
      min-height: 28px;
      border-radius: 999px;
      background: #e8f6f1 !important;
      color: #165a51 !important;
      font-weight: 800;
    }

    .loading,
    .no-data {
      display: grid;
      place-items: center;
      gap: 8px;
      min-height: 180px;
      color: #8290a1;
      text-align: center;
    }

    @media (max-width: 1100px) {
      .summary-grid,
      .profile-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .profile-columns {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 680px) {
      .customers-hero,
      .form-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .summary-grid,
      .profile-metrics {
        grid-template-columns: 1fr;
      }

      .address-field {
        grid-column: span 1;
      }
    }
  `],
})
export class CustomersComponent implements OnInit {
  customerService = inject(CustomerService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  showForm = signal<boolean>(false);
  editingCustomer = signal<Customer | null>(null);
  selectedProfile = signal<CustomerProfileResponse | null>(null);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  displayedColumns = [
    'name',
    'type',
    'loyaltyPoints',
    'totalPurchases',
    'lastPurchase',
    'creditBalance',
    'actions',
  ];

  customerTypes: { value: CustomerType; label: string }[] = [
    { value: 'walk_in', label: 'Walk-in Customer' },
    { value: 'regular', label: 'Regular Customer' },
    { value: 'wholesale', label: 'Wholesale Customer' },
    { value: 'vip', label: 'VIP Customer' },
    { value: 'credit', label: 'Credit Customer' },
  ];

  customerForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    email: [''],
    address: [''],
    customerType: ['regular' as CustomerType, Validators.required],
    loyaltyPoints: [0, Validators.min(0)],
    totalPurchases: [0, Validators.min(0)],
    lastPurchaseDate: [''],
    creditBalance: [0],
  });

  filteredCustomers = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.customerService.customers();

    return this.customerService.customers().filter((customer) =>
      [
        customer.name,
        customer.phone,
        customer.email || '',
        this.customerTypeLabel(customer.customerType),
      ].some((value) => value.toLowerCase().includes(query))
    );
  });

  totalLoyaltyPoints = computed(() =>
    this.customerService.customers().reduce((sum, customer) =>
      sum + Number(customer.loyaltyPoints || 0), 0
    )
  );

  totalCreditBalance = computed(() =>
    this.customerService.customers().reduce((sum, customer) =>
      sum + Number(customer.creditBalance || 0), 0
    )
  );

  totalSpending = computed(() =>
    this.customerService.customers().reduce((sum, customer) =>
      sum + Number(customer.totalPurchases || 0), 0
    )
  );

  ngOnInit(): void {
    this.customerService.getCustomers().subscribe();
  }

  openForm(): void {
    this.showForm.set(true);
    this.editingCustomer.set(null);
    this.customerForm.reset({
      customerType: 'regular',
      loyaltyPoints: 0,
      totalPurchases: 0,
      creditBalance: 0,
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingCustomer.set(null);
    this.customerForm.reset();
  }

  editCustomer(customer: Customer): void {
    this.editingCustomer.set(customer);
    this.showForm.set(true);
    this.customerForm.patchValue({
      ...customer,
      customerType: customer.customerType || 'regular',
      lastPurchaseDate: this.toDateInput(customer.lastPurchaseDate),
      creditBalance: customer.creditBalance || 0,
      loyaltyPoints: customer.loyaltyPoints || 0,
      totalPurchases: customer.totalPurchases || 0,
    });
  }

  viewProfile(customer: Customer): void {
    this.customerService.getCustomerProfile(customer._id).subscribe({
      next: (profile) => this.selectedProfile.set(profile),
      error: () => this.snackBar.open('Customer profile failed to load.', 'Close', {
        duration: 3000,
      }),
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) return;

    this.isLoading.set(true);
    const editing = this.editingCustomer();
    const payload = {
      ...this.customerForm.value,
      lastPurchaseDate: this.customerForm.value.lastPurchaseDate || undefined,
    };

    const request$ = editing
      ? this.customerService.updateCustomer(editing._id, payload)
      : this.customerService.createCustomer(payload);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open(
          `Customer ${editing ? 'updated' : 'created'} successfully.`,
          'Close',
          { duration: 3000 }
        );
        this.closeForm();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(
          err.error?.message || 'Operation failed.',
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
        this.snackBar.open('Customer deleted.', 'Close', { duration: 3000 });
        if (this.selectedProfile()?.customer?._id === id) {
          this.selectedProfile.set(null);
        }
      },
      error: () => {
        this.snackBar.open('Delete failed.', 'Close', { duration: 3000 });
      },
    });
  }

  customerTypeLabel(type?: CustomerType): string {
    return this.customerTypes.find((item) => item.value === type)?.label || 'Regular Customer';
  }

  loyaltyValue(customer: Customer): number {
    return Math.floor(Number(customer.loyaltyPoints || 0) / 100) * 5;
  }

  private toDateInput(value?: Date | string): string {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
  }
}
