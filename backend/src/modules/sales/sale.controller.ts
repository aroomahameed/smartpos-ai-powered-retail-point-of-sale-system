import { Request, Response } from 'express';
import Sale from './sale.model';
import Product from '../products/product.model';
import Customer from '../customers/customer.model';

// @route   POST /api/sales
// @access  Private - Cashier, Manager, Admin
export const createSale = async (req: any, res: Response): Promise<void> => {
  try {
    const { items, customerId, discount, tax, paymentMethod, amountPaid, notes } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: '❌ No items in sale' });
      return;
    }

    // Build sale items and calculate totals
    let subtotal = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product || !product.isActive) {
        res.status(404).json({ message: `❌ Product not found: ${item.productId}` });
        return;
      }

      if (product.stock < item.quantity) {
        res.status(400).json({ message: `❌ Insufficient stock for: ${product.name}` });
        return;
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      saleItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: product.price,
        cost: product.cost,
        subtotal: itemSubtotal,
      });

      // Deduct stock
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    const discountAmount = discount || 0;
    const taxAmount = tax || 0;
    const total = subtotal - discountAmount + taxAmount;
    const change = amountPaid - total;

    if (change < 0) {
      res.status(400).json({ message: '❌ Amount paid is less than total' });
      return;
    }

    const sale = await Sale.create({
      items: saleItems,
      customer: customerId || null,
      cashier: req.user.id,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      paymentMethod,
      amountPaid,
      change,
      notes,
    });

    // Update customer loyalty points if customer provided
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          loyaltyPoints: Math.floor(total),
          totalPurchases: total,
        },
      });
    }

    res.status(201).json({
      message: '✅ Sale completed successfully',
      sale,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   GET /api/sales
// @access  Private - Manager, Admin
export const getSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, status, paymentMethod } = req.query;

    let query: any = {};

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const sales = await Sale.find(query)
      .populate('customer', 'name phone')
      .populate('cashier', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: '✅ Sales fetched successfully',
      count: sales.length,
      sales,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   GET /api/sales/:id
// @access  Private
export const getSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate('cashier', 'name email');

    if (!sale) {
      res.status(404).json({ message: '❌ Sale not found' });
      return;
    }

    res.status(200).json({ sale });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   PUT /api/sales/:id/refund
// @access  Private - Admin, Manager
export const refundSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      res.status(404).json({ message: '❌ Sale not found' });
      return;
    }

    if (sale.status !== 'completed') {
      res.status(400).json({ message: '❌ Only completed sales can be refunded' });
      return;
    }

    // Restore stock
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    sale.status = 'refunded';
    await sale.save();

    res.status(200).json({
      message: '✅ Sale refunded successfully',
      sale,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};