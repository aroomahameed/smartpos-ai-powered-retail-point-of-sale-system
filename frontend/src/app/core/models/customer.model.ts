export interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  loyaltyPoints: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerResponse {
  message: string;
  count?: number;
  customers?: Customer[];
  customer?: Customer;
}