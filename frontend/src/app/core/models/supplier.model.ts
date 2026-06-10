import { Product } from './product.model';

export type SupplierPaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';
export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface SupplierProduct {
  product: string | Product;
  name: string;
  sku: string;
  lastCost: number;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  products: SupplierProduct[];
  totalPurchases: number;
  dueAmount: number;
  lastPurchaseDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  product: string | Product;
  name: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  cost: number;
  subtotal: number;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplier: string | Supplier;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  paidAmount: number;
  dueAmount: number;
  invoiceNumber?: string;
  invoiceDate?: Date;
  paymentStatus: SupplierPaymentStatus;
  status: PurchaseOrderStatus;
  notes?: string;
  createdBy: any;
  receivedBy?: any;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierResponse {
  message: string;
  count?: number;
  suppliers?: Supplier[];
  supplier?: Supplier;
}

export interface SupplierProfileResponse {
  supplier: Supplier;
  summary: {
    totalPurchases: number;
    dueAmount: number;
    lastPurchaseDate?: Date | null;
    productsCount: number;
  };
  purchaseHistory: PurchaseOrder[];
}

export interface PurchaseOrderResponse {
  message: string;
  count?: number;
  purchaseOrders?: PurchaseOrder[];
  purchaseOrder?: PurchaseOrder;
}

export interface PurchaseOrderPayloadItem {
  productId: string;
  quantity: number;
  cost: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  items: PurchaseOrderPayloadItem[];
  paidAmount: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
}
