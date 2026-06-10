import { Request, Response } from 'express';
import Product from '../products/product.model';
import InventoryMovement, { InventoryMovementType } from './inventory.model';

const OUTBOUND_TYPES: InventoryMovementType[] = ['stock_out', 'damage_loss'];
const INBOUND_TYPES: InventoryMovementType[] = ['stock_in', 'supplier_purchase'];

export const createInventoryMovement = async (req: any, res: Response): Promise<void> => {
  try {
    const {
      productId,
      type,
      quantity,
      adjustmentStock,
      reason,
      supplier,
      fromLocation,
      toLocation,
      batchNumber,
      expiryDate,
      referenceNumber,
    } = req.body;

    if (!productId || !type) {
      res.status(400).json({ message: 'Product and inventory action are required' });
      return;
    }

    if (![
      'stock_in',
      'stock_out',
      'adjustment',
      'transfer',
      'damage_loss',
      'supplier_purchase',
    ].includes(type)) {
      res.status(400).json({ message: 'Inventory action is not valid' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const previousStock = Number(product.stock || 0);
    const movementQuantity = Number(quantity || 0);
    let newStock = previousStock;
    let finalQuantity = movementQuantity;

    if (type === 'adjustment') {
      const countedStock = Number(adjustmentStock);
      if (!Number.isFinite(countedStock) || countedStock < 0) {
        res.status(400).json({ message: 'Adjustment stock must be zero or greater' });
        return;
      }

      newStock = countedStock;
      finalQuantity = Math.abs(newStock - previousStock);
    } else if (INBOUND_TYPES.includes(type)) {
      if (!Number.isFinite(movementQuantity) || movementQuantity <= 0) {
        res.status(400).json({ message: 'Quantity must be greater than zero' });
        return;
      }
      newStock = previousStock + movementQuantity;
    } else if (OUTBOUND_TYPES.includes(type)) {
      if (!Number.isFinite(movementQuantity) || movementQuantity <= 0) {
        res.status(400).json({ message: 'Quantity must be greater than zero' });
        return;
      }
      if (previousStock < movementQuantity) {
        res.status(400).json({ message: 'Not enough stock for this action' });
        return;
      }
      newStock = previousStock - movementQuantity;
    } else if (type === 'transfer') {
      if (!Number.isFinite(movementQuantity) || movementQuantity <= 0) {
        res.status(400).json({ message: 'Quantity must be greater than zero' });
        return;
      }
      newStock = previousStock;
    }

    product.stock = newStock;

    if (batchNumber !== undefined) product.batchNumber = batchNumber;
    if (expiryDate !== undefined) product.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    if (supplier !== undefined) product.supplier = supplier;
    if (toLocation) product.location = toLocation;
    if (type !== 'transfer' && fromLocation && !toLocation) product.location = fromLocation;

    await product.save();

    const movement = await InventoryMovement.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type,
      quantity: finalQuantity,
      previousStock,
      newStock,
      reason,
      supplier,
      fromLocation,
      toLocation,
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      referenceNumber,
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: 'Inventory updated',
      product,
      movement,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getInventoryHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, type } = req.query;
    const query: any = {};

    if (productId) query.product = productId;
    if (type) query.type = type;

    const movements = await InventoryMovement.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      message: 'Inventory history fetched',
      count: movements.length,
      movements,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getInventoryDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({ isActive: true }).sort({ stock: 1 });
    const today = new Date();
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 30);

    const lowStock = products
      .filter((product) => Number(product.stock || 0) <= Number(product.reorderLevel || product.lowStockAlert || 0))
      .map((product) => ({
        product,
        status: product.stock === 0 ? 'Out of Stock' : 'Low Stock',
        suggestedAction: 'Reorder',
      }));

    const expiringSoon = products
      .filter((product) => product.expiryDate && product.expiryDate <= soon)
      .map((product) => ({
        product,
        status: product.expiryDate && product.expiryDate < today ? 'Expired' : 'Expiring Soon',
        suggestedAction: 'Review batch',
      }));

    res.status(200).json({
      totalProducts: products.length,
      lowStock,
      expiringSoon,
      healthyStock: products.length - lowStock.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
