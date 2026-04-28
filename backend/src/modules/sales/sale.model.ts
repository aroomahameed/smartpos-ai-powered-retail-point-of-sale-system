import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  items: ISaleItem[];
  customer?: mongoose.Types.ObjectId;
  cashier: mongoose.Types.ObjectId;
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

const saleItemSchema = new Schema<ISaleItem>({
  product:  { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name:     { type: String, required: true },
  sku:      { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price:    { type: Number, required: true },
  cost:     { type: Number, required: true },
  subtotal: { type: Number, required: true },
});

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
    tax:      { type: Number, default: 0 },
    total:    { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile'],
      required: true,
    },
    amountPaid: { type: Number, required: true },
    change:     { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['completed', 'refunded', 'cancelled'],
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