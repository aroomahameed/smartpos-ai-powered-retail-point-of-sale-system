import { Request, Response } from 'express';
import Sale from '../sales/sale.model';
import Product from '../products/product.model';
import Return from './return.model';

type ReturnItemPayload = {
  productId: string;
  quantity: number;
  reason: string;
  restock: boolean;
};

const RETURN_REASONS = [
  'Damaged',
  'Wrong item',
  'Customer changed mind',
  'Expired product',
  'Other',
];

const REFUND_METHODS = ['cash', 'card', 'mobile', 'original'];

export const searchReturnInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceNumber = String(req.params.invoiceNumber || '').trim();

    const sale = await Sale.findOne({ invoiceNumber })
      .populate('customer', 'name phone email')
      .populate('cashier', 'name email');

    if (!sale) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    const returns = await Return.find({ sale: sale._id }).sort({ createdAt: -1 });
    const returnedQuantities = getReturnedQuantities(returns);

    res.status(200).json({
      sale,
      returns,
      returnedQuantities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createReturn = async (req: any, res: Response): Promise<void> => {
  try {
    const {
      invoiceNumber,
      items,
      refundMethod,
      notes,
    }: {
      invoiceNumber: string;
      items: ReturnItemPayload[];
      refundMethod: string;
      notes?: string;
    } = req.body;

    if (!invoiceNumber) {
      res.status(400).json({ message: 'Invoice number is required' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Select at least one item to return' });
      return;
    }

    if (!REFUND_METHODS.includes(refundMethod)) {
      res.status(400).json({ message: 'Invalid refund method' });
      return;
    }

    const sale = await Sale.findOne({ invoiceNumber });
    if (!sale) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (!['completed', 'partially_returned'].includes(sale.status)) {
      res.status(400).json({ message: 'Only completed sales can be returned' });
      return;
    }

    const previousReturns = await Return.find({ sale: sale._id });
    const returnedQuantities = getReturnedQuantities(previousReturns);
    const returnItems = [];

    for (const item of items) {
      const saleItem = sale.items.find(
        (currentItem: any) => currentItem.product.toString() === item.productId
      );

      if (!saleItem) {
        res.status(400).json({ message: `Item not found on invoice: ${item.productId}` });
        return;
      }

      if (!RETURN_REASONS.includes(item.reason)) {
        res.status(400).json({ message: `Invalid return reason for ${saleItem.name}` });
        return;
      }

      const quantity = Number(item.quantity);
      const alreadyReturned = returnedQuantities[item.productId] || 0;
      const returnableQuantity = saleItem.quantity - alreadyReturned;

      if (!Number.isFinite(quantity) || quantity <= 0) {
        res.status(400).json({ message: `Invalid return quantity for ${saleItem.name}` });
        return;
      }

      if (quantity > returnableQuantity) {
        res.status(400).json({
          message: `${saleItem.name} only has ${returnableQuantity} returnable item(s)`,
        });
        return;
      }

      returnItems.push({
        product: saleItem.product,
        name: saleItem.name,
        sku: saleItem.sku,
        quantity,
        price: saleItem.price,
        subtotal: saleItem.price * quantity,
        reason: item.reason,
        restock: !!item.restock,
      });
    }

    const totalRefund = returnItems.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    const returnRecord = await Return.create({
      sale: sale._id,
      invoiceNumber: sale.invoiceNumber,
      items: returnItems,
      refundMethod,
      totalRefund,
      notes,
      processedBy: req.user.id,
    });

    for (const item of returnItems) {
      if (item.restock) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    const refreshedReturns = await Return.find({ sale: sale._id });
    const refreshedReturnedQuantities = getReturnedQuantities(refreshedReturns);
    const soldQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const returnedQuantity = Object.values(refreshedReturnedQuantities)
      .reduce((sum, quantity) => sum + quantity, 0);

    sale.status = returnedQuantity >= soldQuantity ? 'returned' : 'partially_returned';
    await sale.save();

    res.status(201).json({
      message: 'Return completed successfully',
      returnReceipt: returnRecord,
      sale,
      returnedQuantities: refreshedReturnedQuantities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

const getReturnedQuantities = (returns: any[]): Record<string, number> => {
  return returns.reduce((acc, returnRecord) => {
    for (const item of returnRecord.items) {
      const productId = item.product.toString();
      acc[productId] = (acc[productId] || 0) + item.quantity;
    }

    return acc;
  }, {} as Record<string, number>);
};
