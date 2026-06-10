export interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  lowStockAlert: number;
  reorderLevel: number;
  category: string;
  unit: string;
  supplier?: string;
  location?: string;
  batchNumber?: string;
  expiryDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductResponse {
  message: string;
  count?: number;
  products?: Product[];
  product?: Product;
}

export type InventoryMovementType =
  | 'stock_in'
  | 'stock_out'
  | 'adjustment'
  | 'transfer'
  | 'damage_loss'
  | 'supplier_purchase';

export interface InventoryMovement {
  _id: string;
  product: string;
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
  createdBy: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovementPayload {
  productId: string;
  type: InventoryMovementType;
  quantity?: number;
  adjustmentStock?: number;
  reason?: string;
  supplier?: string;
  fromLocation?: string;
  toLocation?: string;
  batchNumber?: string;
  expiryDate?: string;
  referenceNumber?: string;
}

export interface InventoryMovementResponse {
  message: string;
  product: Product;
  movement: InventoryMovement;
}

export interface InventoryHistoryResponse {
  message: string;
  count: number;
  movements: InventoryMovement[];
}

export interface InventoryDashboardItem {
  product: Product;
  status: string;
  suggestedAction: string;
}

export interface InventoryDashboard {
  totalProducts: number;
  lowStock: InventoryDashboardItem[];
  expiringSoon: InventoryDashboardItem[];
  healthyStock: number;
}
