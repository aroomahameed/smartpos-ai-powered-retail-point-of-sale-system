import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  category?: string;
  quantity: number;
  price: number;
  cost: number;
  discount: number;
  subtotal: number;
}

export interface ISalePayment {
  method: 'cash' | 'card' | 'mobile';
  amount: number;
}

export interface ISaleDiscount {
  type: 'percentage' | 'fixed' | 'product' | 'category' | 'loyalty' | 'coupon';
  label: string;
  amount: number;
  value?: number;
  code?: string;
  scope?: string;
}

export interface ISale extends Document {
  invoiceNumber: string;
  items: ISaleItem[];
  customer?: mongoose.Types.ObjectId;
  cashier: mongoose.Types.ObjectId;
  subtotal: number;
  discount: number;
  discounts: ISaleDiscount[];
  couponCode?: string;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'split';
  payments: ISalePayment[];
  amountPaid: number;
  change: number;
  status: 'completed' | 'refunded' | 'cancelled' | 'partially_returned' | 'returned';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>({
  product:  { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name:     { type: String, required: true },
  sku:      { type: String, required: true },
  category: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  price:    { type: Number, required: true },
  cost:     { type: Number, required: true },
  discount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
});

const salePaymentSchema = new Schema<ISalePayment>(
  {
    method: {
      type: String,
      enum: ['cash', 'card', 'mobile'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const saleDiscountSchema = new Schema<ISaleDiscount>(
  {
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'product', 'category', 'loyalty', 'coupon'],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    value: {
      type: Number,
      min: 0,
    },
    code: {
      type: String,
      uppercase: true,
      trim: true,
    },
    scope: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
    },
    items: [saleItemSchema],
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    cashier: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discounts: {
      type: [saleDiscountSchema],
      default: [],
    },
    couponCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    tax:      { type: Number, default: 0 },
    total:    { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile', 'split'],
      required: true,
    },
    payments: {
      type: [salePaymentSchema],
      default: [],
    },
    amountPaid: { type: Number, required: true },
    change:     { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['completed', 'refunded', 'cancelled', 'partially_returned', 'returned'],
      default: 'completed',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// Auto generate invoice number before saving
saleSchema.pre<ISale>('save', async function (next: any) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Sale').countDocuments();
    this.invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model<ISale>('Sale', saleSchema);
