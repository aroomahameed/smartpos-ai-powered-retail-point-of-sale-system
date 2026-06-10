export interface SaleItem {
  product?: string;
  productId?: string;
  name: string;
  sku: string;
  category?: string;
  quantity: number;
  price: number;
  cost: number;
  discount?: number;
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'card' | 'mobile';
export type SalePaymentMethod = PaymentMethod | 'split';

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
}

export type DiscountLineType =
  | 'percentage'
  | 'fixed'
  | 'product'
  | 'category'
  | 'loyalty'
  | 'coupon';

export interface DiscountLine {
  type: DiscountLineType;
  label: string;
  amount: number;
  value?: number;
  code?: string;
  scope?: string;
}

export interface CheckoutDiscountConfig {
  percentageDiscount: number;
  fixedDiscount: number;
  productDiscounts: {
    productId: string;
    percentage: number;
  }[];
  categoryDiscount: {
    category: string;
    percentage: number;
  };
  loyaltyPointsToRedeem: number;
  couponCode: string;
}

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  _id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  expiresAt: Date;
  minimumPurchaseAmount: number;
  isActive: boolean;
}

export interface CouponValidationResponse {
  coupon: Coupon;
  discountAmount: number;
  message: string;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  items: SaleItem[];
  customer?: any;
  cashier: any;
  subtotal: number;
  discount: number;
  discounts?: DiscountLine[];
  couponCode?: string;
  tax: number;
  total: number;
  paymentMethod: SalePaymentMethod;
  payments?: PaymentEntry[];
  amountPaid: number;
  change: number;
  status: 'completed' | 'refunded' | 'cancelled' | 'partially_returned' | 'returned';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  productDiscountPercent?: number;
}

export interface HeldOrder {
  id: number;
  customerName: string;
  items: CartItem[];
  discount: number;
  discountConfig?: CheckoutDiscountConfig;
  tax: number;
  paymentMethod: SalePaymentMethod;
  payments?: PaymentEntry[];
  amountPaid: number;
  createdAt: string;
}

export interface SaleResponse {
  message: string;
  count?: number;
  sales?: Sale[];
  sale?: Sale;
}

export type ReturnReason =
  | 'Damaged'
  | 'Wrong item'
  | 'Customer changed mind'
  | 'Expired product'
  | 'Other';

export type RefundMethod = 'cash' | 'card' | 'mobile' | 'original';

export interface ReturnReceiptItem {
  product: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  subtotal: number;
  reason: ReturnReason;
  restock: boolean;
}

export interface ReturnReceipt {
  _id: string;
  returnReceiptNumber: string;
  sale: string;
  invoiceNumber: string;
  items: ReturnReceiptItem[];
  refundMethod: RefundMethod;
  totalRefund: number;
  notes?: string;
  processedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReturnInvoiceResponse {
  sale: Sale;
  returns: ReturnReceipt[];
  returnedQuantities: Record<string, number>;
}

export interface CreateReturnPayload {
  invoiceNumber: string;
  refundMethod: RefundMethod;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    reason: ReturnReason;
    restock: boolean;
  }[];
}

export interface CreateReturnResponse {
  message: string;
  returnReceipt: ReturnReceipt;
  sale: Sale;
  returnedQuantities: Record<string, number>;
}
