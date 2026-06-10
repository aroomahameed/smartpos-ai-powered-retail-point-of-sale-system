import mongoose, { Document, Schema } from 'mongoose';

export type SupplierPaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';
export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface IPurchaseOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  cost: number;
  subtotal: number;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface IPurchaseOrder extends Document {
  orderNumber: string;
  supplier: mongoose.Types.ObjectId;
  supplierName: string;
  items: IPurchaseOrderItem[];
  subtotal: number;
  paidAmount: number;
  dueAmount: number;
  invoiceNumber?: string;
  invoiceDate?: Date;
  paymentStatus: SupplierPaymentStatus;
  status: PurchaseOrderStatus;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [purchaseOrderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    invoiceDate: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'unpaid', 'overdue'],
      default: 'unpaid',
    },
    status: {
      type: String,
      enum: ['draft', 'ordered', 'received', 'cancelled'],
      default: 'ordered',
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    receivedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

purchaseOrderSchema.pre<IPurchaseOrder>('save', async function (next: any) {
  if (!this.orderNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.orderNumber = `PO-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
