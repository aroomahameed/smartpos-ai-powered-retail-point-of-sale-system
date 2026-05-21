export interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  lowStockAlert: number;
  category: string;
  unit: string;
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