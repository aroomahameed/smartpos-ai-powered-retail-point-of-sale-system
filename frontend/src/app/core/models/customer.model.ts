export interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  customerType: CustomerType;
  loyaltyPoints: number;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  creditBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerType =
  | 'walk_in'
  | 'regular'
  | 'wholesale'
  | 'vip'
  | 'credit';

export interface CustomerResponse {
  message: string;
  count?: number;
  customers?: Customer[];
  customer?: Customer;
}

export interface CustomerProfileSummary {
  totalSpending: number;
  lastPurchaseDate?: Date | null;
  loyaltyPoints: number;
  loyaltyDiscountValue: number;
  creditBalance: number;
  customerType: CustomerType;
}

export interface FavoriteProduct {
  _id: string;
  name: string;
  sku: string;
  quantity: number;
  spending: number;
}

export interface CustomerProfileResponse {
  customer: Customer;
  summary: CustomerProfileSummary;
  purchaseHistory: any[];
  favoriteProducts: FavoriteProduct[];
}
