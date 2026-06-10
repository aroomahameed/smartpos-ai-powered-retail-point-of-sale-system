import mongoose, { Document, Schema } from 'mongoose';

export type ReturnReason =
  | 'Damaged'
  | 'Wrong item'
  | 'Customer changed mind'
  | 'Expired product'
  | 'Other';

export type RefundMethod = 'cash' | 'card' | 'mobile' | 'original';

export interface IReturnItem {
  product: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  subtotal: number;
  reason: ReturnReason;
  restock: boolean;
}

export interface IReturn extends Document {
  returnReceiptNumber: string;
  sale: mongoose.Types.ObjectId;
  invoiceNumber: string;
  items: IReturnItem[];
  refundMethod: RefundMethod;
  totalRefund: number;
  notes?: string;
  processedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const returnItemSchema = new Schema<IReturnItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ['Damaged', 'Wrong item', 'Customer changed mind', 'Expired product', 'Other'],
      required: true,
    },
    restock: { type: Boolean, default: false },
  },
  { _id: false }
);

const returnSchema = new Schema<IReturn>(
  {
    returnReceiptNumber: {
      type: String,
      unique: true,
    },
    sale: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
    },
    items: [returnItemSchema],
    refundMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile', 'original'],
      required: true,
    },
    totalRefund: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: { type: String },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

returnSchema.pre<IReturn>('save', async function (next: any) {
  if (!this.returnReceiptNumber) {
    const count = await mongoose.model('Return').countDocuments();
    this.returnReceiptNumber = `RET-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model<IReturn>('Return', returnSchema);
