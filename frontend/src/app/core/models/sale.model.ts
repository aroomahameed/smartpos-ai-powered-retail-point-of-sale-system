export interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  items: SaleItem[];
  customer?: any;
  cashier: any;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  amountPaid: number;
  change: number;
  status: 'completed' | 'refunded' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
}

export interface SaleResponse {
  message: string;
  count?: number;
  sales?: Sale[];
  sale?: Sale;
}