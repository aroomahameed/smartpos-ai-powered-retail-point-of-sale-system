import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplierProduct {
  product: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  lastCost: number;
}

export interface ISupplier extends Document {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  products: ISupplierProduct[];
  totalPurchases: number;
  dueAmount: number;
  lastPurchaseDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierProductSchema = new Schema<ISupplierProduct>(
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
    lastCost: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const supplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    products: {
      type: [supplierProductSchema],
      default: [],
    },
    totalPurchases: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    lastPurchaseDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISupplier>('Supplier', supplierSchema);
