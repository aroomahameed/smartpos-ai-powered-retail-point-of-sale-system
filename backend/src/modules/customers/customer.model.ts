import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  customerType:
    | 'walk_in'
    | 'regular'
    | 'wholesale'
    | 'vip'
    | 'credit';
  loyaltyPoints: number;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  creditBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    customerType: {
      type: String,
      enum: ['walk_in', 'regular', 'wholesale', 'vip', 'credit'],
      default: 'regular',
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
    },
    lastPurchaseDate: {
      type: Date,
    },
    creditBalance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICustomer>('Customer', customerSchema);
