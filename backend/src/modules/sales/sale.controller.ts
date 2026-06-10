import { Request, Response } from 'express';
import Sale from './sale.model';
import Product from '../products/product.model';
import Customer from '../customers/customer.model';
import Coupon from '../coupons/coupon.model';

// @route   POST /api/sales
// @access  Private - Cashier, Manager, Admin
export const createSale = async (req: any, res: Response): Promise<void> => {
  try {
    const {
      items,
      customerId,
      discount,
      tax,
      paymentMethod,
      payments,
      amountPaid,
      discounts,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: '❌ No items in sale' });
      return;
    }

    // Build sale items and calculate totals
    let subtotal = 0;
    const saleItems = [];
    const stockUpdates = [];
    const discountLines: {
      type: 'percentage' | 'fixed' | 'product' | 'category' | 'loyalty' | 'coupon';
      label: string;
      amount: number;
      value?: number;
      code?: string;
      scope?: string;
    }[] = [];
    const categorySubtotals = new Map<string, number>();
    const productDiscounts = Array.isArray(discounts?.productDiscounts)
      ? discounts.productDiscounts
      : [];
    let redeemedLoyaltyPoints = 0;

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

      const grossItemSubtotal = product.price * item.quantity;
      const productDiscountPercent = clampPercent(
        Number(
          item.productDiscountPercent ??
          productDiscounts.find((discount: any) =>
            String(discount.productId) === String(product._id)
          )?.percentage ??
          0
        )
      );
      const productDiscountAmount = roundMoney(
        grossItemSubtotal * (productDiscountPercent / 100)
      );
      const itemSubtotal = roundMoney(grossItemSubtotal - productDiscountAmount);

      subtotal += grossItemSubtotal;
      const categoryKey = product.category.trim().toLowerCase();
      categorySubtotals.set(
        categoryKey,
        (categorySubtotals.get(categoryKey) || 0) + grossItemSubtotal
      );

      if (productDiscountAmount > 0) {
        discountLines.push({
          type: 'product',
          label: `${product.name} product discount`,
          value: productDiscountPercent,
          amount: productDiscountAmount,
          scope: String(product._id),
        });
      }

      saleItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        quantity: item.quantity,
        price: product.price,
        cost: product.cost,
        discount: productDiscountAmount,
        subtotal: itemSubtotal,
      });

      stockUpdates.push({
        productId: product._id,
        quantity: item.quantity,
      });
    }

    subtotal = roundMoney(subtotal);
    addOrderDiscounts(discounts || {}, subtotal, categorySubtotals, discountLines);

    if (discount && !discounts) {
      discountLines.push({
        type: 'fixed',
        label: 'Manual discount',
        amount: roundMoney(Number(discount || 0)),
      });
    }

    if (customerId && Number(discounts?.loyaltyPointsToRedeem || 0) > 0) {
      const customer = await Customer.findById(customerId);
      if (customer && customer.loyaltyPoints > 0) {
        const requestedPoints = Math.floor(Number(discounts.loyaltyPointsToRedeem || 0));
        redeemedLoyaltyPoints = Math.floor(
          Math.min(requestedPoints, customer.loyaltyPoints) / 100
        ) * 100;
        const loyaltyAmount = roundMoney((redeemedLoyaltyPoints / 100) * 5);
        if (loyaltyAmount > 0) {
          discountLines.push({
            type: 'loyalty',
            label: `${customer.name} loyalty points`,
            value: redeemedLoyaltyPoints,
            amount: Math.min(loyaltyAmount, subtotal),
            scope: String(customer._id),
          });
        }
      }
    }

    if (discounts?.couponCode) {
      const couponCode = String(discounts.couponCode).trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      if (!coupon) {
        res.status(400).json({ message: 'Coupon code is not valid' });
        return;
      }
      if (coupon.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ message: 'Coupon has expired' });
        return;
      }
      if (subtotal < coupon.minimumPurchaseAmount) {
        res.status(400).json({ message: `Minimum bill is ${coupon.minimumPurchaseAmount}` });
        return;
      }

      const couponAmount = roundMoney(Math.min(
        coupon.discountType === 'percentage'
          ? subtotal * (coupon.discountValue / 100)
          : coupon.discountValue,
        subtotal
      ));

      if (couponAmount > 0) {
        discountLines.push({
          type: 'coupon',
          label: `Coupon ${coupon.code}`,
          value: coupon.discountValue,
          amount: couponAmount,
          code: coupon.code,
        });
      }
    }

    const discountAmount = roundMoney(Math.min(
      discountLines.reduce((sum, line) => sum + line.amount, 0),
      subtotal
    ));
    const taxAmount = tax || 0;
    const total = roundMoney(Math.max(subtotal - discountAmount + taxAmount, 0));
    const normalizedPayments = normalizePayments(payments, paymentMethod, amountPaid);
    const paidTotal = normalizedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const finalPaymentMethod = normalizedPayments.length > 1
      ? 'split'
      : normalizedPayments[0]?.method || paymentMethod || 'cash';
    const change = paidTotal - total;

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
      discounts: discountLines,
      couponCode: discounts?.couponCode
        ? String(discounts.couponCode).trim().toUpperCase()
        : undefined,
      tax: taxAmount,
      total,
      paymentMethod: finalPaymentMethod,
      payments: normalizedPayments,
      amountPaid: paidTotal,
      change,
      notes,
    });

    // Deduct stock after payment validation succeeds.
    for (const update of stockUpdates) {
      await Product.findByIdAndUpdate(update.productId, {
        $inc: { stock: -update.quantity },
      });
    }

    // Update customer loyalty points if customer provided
    if (customerId) {
      const earnedPoints = Math.floor(total);
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          loyaltyPoints: earnedPoints - redeemedLoyaltyPoints,
          totalPurchases: total,
        },
        $set: {
          lastPurchaseDate: new Date(),
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

const roundMoney = (value: number): number =>
  Math.round(Number(value || 0) * 100) / 100;

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, 100);
};

const addOrderDiscounts = (
  discounts: any,
  subtotal: number,
  categorySubtotals: Map<string, number>,
  discountLines: {
    type: 'percentage' | 'fixed' | 'product' | 'category' | 'loyalty' | 'coupon';
    label: string;
    amount: number;
    value?: number;
    code?: string;
    scope?: string;
  }[]
): void => {
  const percentage = clampPercent(Number(discounts.percentageDiscount || 0));
  if (percentage > 0) {
    discountLines.push({
      type: 'percentage',
      label: 'Percentage discount',
      value: percentage,
      amount: roundMoney(subtotal * (percentage / 100)),
    });
  }

  const fixed = roundMoney(Number(discounts.fixedDiscount || 0));
  if (fixed > 0) {
    discountLines.push({
      type: 'fixed',
      label: 'Fixed discount',
      amount: fixed,
    });
  }

  const category = String(discounts.categoryDiscount?.category || '').trim();
  const categoryPercentage = clampPercent(Number(discounts.categoryDiscount?.percentage || 0));
  if (category && categoryPercentage > 0) {
    const categorySubtotal = categorySubtotals.get(category.toLowerCase()) || 0;
    const amount = roundMoney(categorySubtotal * (categoryPercentage / 100));
    if (amount > 0) {
      discountLines.push({
        type: 'category',
        label: `${category} category discount`,
        value: categoryPercentage,
        amount,
        scope: category,
      });
    }
  }
};

const normalizePayments = (
  payments: any,
  paymentMethod: 'cash' | 'card' | 'mobile' | undefined,
  amountPaid: number | undefined
): { method: 'cash' | 'card' | 'mobile'; amount: number }[] => {
  const validMethods = ['cash', 'card', 'mobile'];

  if (Array.isArray(payments)) {
    return payments
      .filter((payment) =>
        validMethods.includes(payment.method) &&
        Number(payment.amount) > 0
      )
      .map((payment) => ({
        method: payment.method,
        amount: Number(payment.amount),
      }));
  }

  return [{
    method: paymentMethod || 'cash',
    amount: Number(amountPaid || 0),
  }];
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
