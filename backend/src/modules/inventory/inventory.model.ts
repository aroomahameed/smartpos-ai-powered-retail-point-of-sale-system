import mongoose, { Document, Schema } from 'mongoose';

export type InventoryMovementType =
  | 'stock_in'
  | 'stock_out'
  | 'adjustment'
  | 'transfer'
  | 'damage_loss'
  | 'supplier_purchase';

export interface IInventoryMovement extends Document {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  supplier?: string;
  fromLocation?: string;
  toLocation?: string;
  batchNumber?: string;
  expiryDate?: Date;
  referenceNumber?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'stock_in',
        'stock_out',
        'adjustment',
        'transfer',
        'damage_loss',
        'supplier_purchase',
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    supplier: {
      type: String,
      trim: true,
    },
    fromLocation: {
      type: String,
      trim: true,
    },
    toLocation: {
      type: String,
      trim: true,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IInventoryMovement>(
  'InventoryMovement',
  inventoryMovementSchema
);
