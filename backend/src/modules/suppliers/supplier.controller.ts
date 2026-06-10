import { Request, Response } from 'express';
import Product from '../products/product.model';
import InventoryMovement from '../inventory/inventory.model';
import PurchaseOrder, { SupplierPaymentStatus } from './purchase-order.model';
import Supplier from './supplier.model';

const paymentStatusFromAmounts = (
  total: number,
  paidAmount: number,
  dueDate?: string
): SupplierPaymentStatus => {
  if (paidAmount >= total) return 'paid';
  if (dueDate && new Date(dueDate).getTime() < Date.now()) return 'overdue';
  if (paidAmount > 0) return 'partial';
  return 'unpaid';
};

export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const query: any = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Suppliers fetched',
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getSupplierProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier || !supplier.isActive) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    const purchaseHistory = await PurchaseOrder.find({ supplier: supplier._id })
      .sort({ createdAt: -1 })
      .limit(25);

    res.status(200).json({
      supplier,
      purchaseHistory,
      summary: {
        totalPurchases: supplier.totalPurchases,
        dueAmount: supplier.dueAmount,
        lastPurchaseDate: supplier.lastPurchaseDate || purchaseHistory[0]?.createdAt || null,
        productsCount: supplier.products.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      products,
      dueAmount,
    } = req.body;

    const supplier = await Supplier.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      products: Array.isArray(products) ? products : [],
      dueAmount,
    });

    res.status(201).json({
      message: 'Supplier created',
      supplier,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    res.status(200).json({
      message: 'Supplier updated',
      supplier,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    res.status(200).json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierId, paymentStatus, status } = req.query;
    const query: any = {};

    if (supplierId) query.supplier = supplierId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (status) query.status = status;

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name email')
      .populate('receivedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Purchase orders fetched',
      count: purchaseOrders.length,
      purchaseOrders,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createPurchaseOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const {
      supplierId,
      items,
      paidAmount,
      invoiceNumber,
      invoiceDate,
      dueDate,
      notes,
    } = req.body;

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Supplier and products are required' });
      return;
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier || !supplier.isActive) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        res.status(404).json({ message: `Product not found: ${item.productId}` });
        return;
      }

      const quantity = Number(item.quantity || 0);
      const cost = Number(item.cost ?? product.cost ?? 0);

      if (quantity <= 0) {
        res.status(400).json({ message: `Quantity must be greater than zero for ${product.name}` });
        return;
      }

      const lineSubtotal = Math.round(quantity * cost * 100) / 100;
      subtotal += lineSubtotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity,
        receivedQuantity: 0,
        cost,
        subtotal: lineSubtotal,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const paid = Math.min(Math.max(Number(paidAmount || 0), 0), subtotal);
    const dueAmount = Math.round((subtotal - paid) * 100) / 100;

    const purchaseOrder = await PurchaseOrder.create({
      supplier: supplier._id,
      supplierName: supplier.name,
      items: orderItems,
      subtotal,
      paidAmount: paid,
      dueAmount,
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
      paymentStatus: paymentStatusFromAmounts(subtotal, paid, dueDate),
      notes,
      createdBy: req.user.id,
    });

    await syncSupplierFromOrder(supplier._id.toString(), purchaseOrder);

    res.status(201).json({
      message: 'Purchase order created',
      purchaseOrder,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const receivePurchaseOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      res.status(404).json({ message: 'Purchase order not found' });
      return;
    }

    if (purchaseOrder.status === 'received') {
      res.status(400).json({ message: 'Purchase order is already received' });
      return;
    }

    for (const item of purchaseOrder.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const previousStock = Number(product.stock || 0);
      const quantityToReceive = Math.max(item.quantity - item.receivedQuantity, 0);
      const newStock = previousStock + quantityToReceive;

      if (quantityToReceive > 0) {
        product.stock = newStock;
        product.cost = item.cost;
        product.supplier = purchaseOrder.supplierName;
        if (item.batchNumber) product.batchNumber = item.batchNumber;
        if (item.expiryDate) product.expiryDate = item.expiryDate;
        await product.save();

        await InventoryMovement.create({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          type: 'supplier_purchase',
          quantity: quantityToReceive,
          previousStock,
          newStock,
          supplier: purchaseOrder.supplierName,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          referenceNumber: purchaseOrder.orderNumber,
          reason: 'Received supplier purchase order',
          createdBy: req.user.id,
        });
      }

      item.receivedQuantity = item.quantity;
    }

    purchaseOrder.status = 'received';
    purchaseOrder.receivedBy = req.user.id;
    purchaseOrder.receivedAt = new Date();
    await purchaseOrder.save();

    res.status(200).json({
      message: 'Stock received and inventory updated',
      purchaseOrder,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paidAmount, paymentStatus } = req.body;
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      res.status(404).json({ message: 'Purchase order not found' });
      return;
    }

    const paid = Math.min(Math.max(Number(paidAmount ?? purchaseOrder.paidAmount), 0), purchaseOrder.subtotal);
    purchaseOrder.paidAmount = paid;
    purchaseOrder.dueAmount = Math.round((purchaseOrder.subtotal - paid) * 100) / 100;
    purchaseOrder.paymentStatus = paymentStatus || paymentStatusFromAmounts(purchaseOrder.subtotal, paid);
    await purchaseOrder.save();

    await syncSupplierFromOrder(purchaseOrder.supplier.toString(), purchaseOrder);

    res.status(200).json({
      message: 'Payment status updated',
      purchaseOrder,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

const syncSupplierFromOrder = async (
  supplierId: string,
  purchaseOrder: any
): Promise<void> => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) return;

  const products = [...supplier.products];

  for (const item of purchaseOrder.items) {
    const index = products.findIndex((product) =>
      String(product.product) === String(item.product)
    );

    const nextProduct = {
      product: item.product,
      name: item.name,
      sku: item.sku,
      lastCost: item.cost,
    };

    if (index >= 0) {
      products[index] = nextProduct;
    } else {
      products.push(nextProduct);
    }
  }

  supplier.products = products;
  supplier.totalPurchases = await PurchaseOrder.aggregate([
    { $match: { supplier: supplier._id } },
    { $group: { _id: null, total: { $sum: '$subtotal' } } },
  ]).then((rows) => rows[0]?.total || 0);
  supplier.dueAmount = await PurchaseOrder.aggregate([
    { $match: { supplier: supplier._id } },
    { $group: { _id: null, total: { $sum: '$dueAmount' } } },
  ]).then((rows) => rows[0]?.total || 0);
  supplier.lastPurchaseDate = purchaseOrder.createdAt || new Date();
  await supplier.save();
};
