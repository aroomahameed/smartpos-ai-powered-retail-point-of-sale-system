import { Request, Response } from 'express';
import Sale from '../sales/sale.model';
import Product from '../products/product.model';
import Customer from '../customers/customer.model';

// @route   GET /api/reports/dashboard
// @access  Private - Admin, Manager
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: today }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    const monthlySales = await Sale.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
          status: 'completed',
        },
      },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalCustomers = await Customer.countDocuments({ isActive: true });

    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stock', '$lowStockAlert'] },
      isActive: true,
    }).select('name sku stock lowStockAlert');

    res.status(200).json({
      message: '✅ Dashboard stats fetched successfully',
      stats: {
        today: {
          total: todaySales[0]?.total || 0,
          count: todaySales[0]?.count || 0,
        },
        monthly: {
          total: monthlySales[0]?.total || 0,
          count: monthlySales[0]?.count || 0,
        },
        totalProducts,
        totalCustomers,
        lowStockProducts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   GET /api/reports/sales
// @access  Private - Admin, Manager
export const getSalesReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const match: any = { status: 'completed' };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate as string);
      if (endDate) match.createdAt.$lte = new Date(endDate as string);
    }

    const salesByDay = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
          profit: { $sum: { $subtract: ['$total', { $sum: '$items.cost' }] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const paymentBreakdown = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]);

    const topProducts = await Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      message: '✅ Sales report fetched successfully',
      report: {
        salesByDay,
        paymentBreakdown,
        topProducts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   GET /api/reports/inventory
// @access  Private - Admin, Manager
export const getInventoryReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({ isActive: true })
      .select('name sku stock lowStockAlert price cost category')
      .sort({ stock: 1 });

    const totalValue = products.reduce(
      (acc, p) => acc + p.stock * p.cost, 0
    );

    const lowStock = products.filter(p => p.stock <= p.lowStockAlert);
    const outOfStock = products.filter(p => p.stock === 0);

    res.status(200).json({
      message: '✅ Inventory report fetched successfully',
      report: {
        totalProducts: products.length,
        totalInventoryValue: totalValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        lowStockProducts: lowStock,
        outOfStockProducts: outOfStock,
        products,
      },
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};