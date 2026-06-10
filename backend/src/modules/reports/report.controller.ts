import { Request, Response } from 'express';
import Sale from '../sales/sale.model';
import Product from '../products/product.model';
import Customer from '../customers/customer.model';
import Return from '../returns/return.model';
import InventoryMovement from '../inventory/inventory.model';

const activeSaleStatuses = ['completed', 'partially_returned'];

const createDateMatch = (startDate?: any, endDate?: any): any => {
  const createdAt: any = {};
  if (startDate) createdAt.$gte = new Date(startDate as string);
  if (endDate) {
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    createdAt.$lte = end;
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
};

const addSaleProfitFields = {
  $addFields: {
    totalCost: {
      $sum: {
        $map: {
          input: '$items',
          as: 'item',
          in: { $multiply: ['$$item.cost', '$$item.quantity'] },
        },
      },
    },
    netRevenue: { $subtract: ['$subtotal', '$discount'] },
  },
};

const percentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// @route   GET /api/reports/dashboard
// @access  Private - Admin, Manager
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const todaySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: today }, status: 'completed' } },
      {
        $addFields: {
          totalCost: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: { $multiply: ['$$item.cost', '$$item.quantity'] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 },
          profit: {
            $sum: {
              $subtract: [
                { $subtract: ['$subtotal', '$discount'] },
                '$totalCost',
              ],
            },
          },
        },
      },
    ]);

    const monthlySales = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
          status: 'completed',
        },
      },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    const totalOrders = await Sale.countDocuments();
    const pendingReturns = await Sale.countDocuments({ status: 'cancelled' });
    const totalCustomers = await Customer.countDocuments({ isActive: true });

    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stock', { $ifNull: ['$reorderLevel', '$lowStockAlert'] }] },
      isActive: true,
    }).select('name sku stock lowStockAlert reorderLevel batchNumber expiryDate');

    const expiryLimit = new Date();
    expiryLimit.setDate(expiryLimit.getDate() + 30);

    const expiringSoonProducts = await Product.find({
      isActive: true,
      expiryDate: { $lte: expiryLimit },
    })
      .select('name sku stock batchNumber expiryDate')
      .sort({ expiryDate: 1 })
      .limit(8);

    const topSellingProducts = await Sale.aggregate([
      { $match: { status: 'completed' } },
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
      { $limit: 1 },
    ]);

    res.status(200).json({
      message: '✅ Dashboard stats fetched successfully',
      stats: {
        today: {
          total: todaySales[0]?.total || 0,
          count: todaySales[0]?.count || 0,
          profit: todaySales[0]?.profit || 0,
        },
        monthly: {
          total: monthlySales[0]?.total || 0,
          count: monthlySales[0]?.count || 0,
        },
        totalOrders,
        totalCustomers,
        pendingReturns,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        expiringSoonCount: expiringSoonProducts.length,
        expiringSoonProducts,
        topSellingProduct: topSellingProducts[0] || null,
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
        $addFields: {
          totalCost: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: { $multiply: ['$$item.cost', '$$item.quantity'] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
          profit: {
            $sum: {
              $subtract: [
                { $subtract: ['$subtotal', '$discount'] },
                '$totalCost',
              ],
            },
          },
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

// @route   GET /api/reports/analytics
// @access  Private - Admin, Manager
export const getAnalyticsReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = createDateMatch(startDate, endDate);
    const saleMatch = { ...dateMatch, status: { $in: activeSaleStatuses } };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      summaryRows,
      dailySales,
      monthlySales,
      categorySales,
      productSales,
      cashierSales,
      customerSales,
      paymentMethodReport,
      discountReport,
      couponReport,
      taxReport,
      refundSummary,
      refundReasons,
      refundMethods,
      stockMovement,
      products,
      todayCategoryRevenue,
      weeklyCashRows,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: saleMatch },
        addSaleProfitFields,
        {
          $group: {
            _id: null,
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            subtotal: { $sum: '$subtotal' },
            discount: { $sum: '$discount' },
            tax: { $sum: '$tax' },
            cost: { $sum: '$totalCost' },
            profit: { $sum: { $subtract: ['$netRevenue', '$totalCost'] } },
          },
        },
      ]),
      Sale.aggregate([
        { $match: saleMatch },
        addSaleProfitFields,
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            profit: { $sum: { $subtract: ['$netRevenue', '$totalCost'] } },
            tax: { $sum: '$tax' },
            discount: { $sum: '$discount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: saleMatch },
        addSaleProfitFields,
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            profit: { $sum: { $subtract: ['$netRevenue', '$totalCost'] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: saleMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.category', 'Uncategorized'] },
            revenue: { $sum: '$items.subtotal' },
            quantity: { $sum: '$items.quantity' },
            cost: { $sum: { $multiply: ['$items.cost', '$items.quantity'] } },
            profit: {
              $sum: {
                $subtract: [
                  '$items.subtotal',
                  { $multiply: ['$items.cost', '$items.quantity'] },
                ],
              },
            },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Sale.aggregate([
        { $match: saleMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            sku: { $first: '$items.sku' },
            category: { $first: '$items.category' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
            cost: { $sum: { $multiply: ['$items.cost', '$items.quantity'] } },
          },
        },
        { $addFields: { profit: { $subtract: ['$revenue', '$cost'] } } },
        { $sort: { quantity: -1 } },
        { $limit: 10 },
      ]),
      Sale.aggregate([
        { $match: saleMatch },
        addSaleProfitFields,
        {
          $group: {
            _id: '$cashier',
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            profit: { $sum: { $subtract: ['$netRevenue', '$totalCost'] } },
          },
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'cashier' } },
        { $unwind: { path: '$cashier', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$cashier.name', 'Unknown cashier'] }, revenue: 1, orders: 1, profit: 1 } },
        { $sort: { revenue: -1 } },
      ]),
      Sale.aggregate([
        { $match: { ...saleMatch, customer: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$customer',
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            lastPurchase: { $max: '$createdAt' },
          },
        },
        { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$customer.name', 'Walk-in Customer'] }, phone: '$customer.phone', revenue: 1, orders: 1, lastPurchase: 1 } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
      Sale.aggregate([
        { $match: saleMatch },
        {
          $project: {
            paymentRows: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$payments', []] } }, 0] },
                '$payments',
                [{ method: '$paymentMethod', amount: '$total' }],
              ],
            },
          },
        },
        { $unwind: '$paymentRows' },
        {
          $group: {
            _id: '$paymentRows.method',
            revenue: { $sum: '$paymentRows.amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Sale.aggregate([
        { $match: saleMatch },
        { $unwind: { path: '$discounts', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$discounts.type', 'manual'] },
            amount: { $sum: { $ifNull: ['$discounts.amount', '$discount'] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
      Sale.aggregate([
        { $match: { ...saleMatch, couponCode: { $exists: true, $ne: '' } } },
        {
          $group: {
            _id: '$couponCode',
            amount: { $sum: '$discount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
      Sale.aggregate([
        { $match: saleMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            tax: { $sum: '$tax' },
            taxableSales: { $sum: '$subtotal' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Return.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            refundAmount: { $sum: '$totalRefund' },
            returns: { $sum: 1 },
            returnedItems: { $sum: { $sum: '$items.quantity' } },
          },
        },
      ]),
      Return.aggregate([
        { $match: dateMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.reason',
            refundAmount: { $sum: '$items.subtotal' },
            quantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { refundAmount: -1 } },
      ]),
      Return.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$refundMethod', refundAmount: { $sum: '$totalRefund' }, count: { $sum: 1 } } },
        { $sort: { refundAmount: -1 } },
      ]),
      InventoryMovement.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              type: '$type',
            },
            quantity: { $sum: '$quantity' },
          },
        },
        { $sort: { '_id.day': 1 } },
      ]),
      Product.find({ isActive: true })
        .select('name sku stock lowStockAlert reorderLevel price cost category supplier expiryDate batchNumber')
        .sort({ stock: 1 }),
      Sale.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: { $in: activeSaleStatuses } } },
        { $unwind: '$items' },
        { $group: { _id: { $ifNull: ['$items.category', 'Uncategorized'] }, revenue: { $sum: '$items.subtotal' } } },
        { $sort: { revenue: -1 } },
      ]),
      Sale.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
              $lt: tomorrow,
            },
            status: { $in: activeSaleStatuses },
          },
        },
        {
          $project: {
            week: {
              $cond: [{ $gte: ['$createdAt', new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)] }, 'current', 'previous'],
            },
            paymentRows: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$payments', []] } }, 0] },
                '$payments',
                [{ method: '$paymentMethod', amount: '$total' }],
              ],
            },
          },
        },
        { $unwind: '$paymentRows' },
        { $match: { 'paymentRows.method': 'cash' } },
        { $group: { _id: '$week', amount: { $sum: '$paymentRows.amount' } } },
      ]),
    ]);

    const inventoryProducts = products as any[];
    const lowStockProducts = inventoryProducts.filter((product) =>
      Number(product.stock || 0) <= Number(product.reorderLevel ?? product.lowStockAlert ?? 0)
    );
    const inventoryValue = inventoryProducts.reduce((sum, product) =>
      sum + Number(product.stock || 0) * Number(product.cost || 0), 0
    );
    const totalRevenue = Number(summaryRows[0]?.revenue || 0);
    const topTodayCategory = todayCategoryRevenue[0];
    const topMarginCategory = categorySales
      .filter((category) => Number(category.revenue || 0) > 0)
      .map((category) => ({
        ...category,
        margin: Math.round((Number(category.profit || 0) / Number(category.revenue || 1)) * 100),
      }))
      .sort((a, b) => b.margin - a.margin)[0];
    const currentCash = Number(weeklyCashRows.find((row) => row._id === 'current')?.amount || 0);
    const previousCash = Number(weeklyCashRows.find((row) => row._id === 'previous')?.amount || 0);

    const insights = [
      topTodayCategory
        ? `${topTodayCategory._id} generated ${Math.round((Number(topTodayCategory.revenue || 0) / Math.max(totalRevenue, 1)) * 100)}% of today's revenue.`
        : 'No category revenue has been recorded today.',
      topMarginCategory
        ? `${topMarginCategory._id} has the highest profit margin at ${topMarginCategory.margin}%.`
        : 'No category profit margin is available for the selected period.',
      `Cash payments changed by ${percentChange(currentCash, previousCash)}% this week.`,
    ];

    res.status(200).json({
      message: 'Analytics report fetched successfully',
      report: {
        summary: {
          revenue: totalRevenue,
          orders: summaryRows[0]?.orders || 0,
          profit: summaryRows[0]?.profit || 0,
          discount: summaryRows[0]?.discount || 0,
          tax: summaryRows[0]?.tax || 0,
          refundAmount: refundSummary[0]?.refundAmount || 0,
          returns: refundSummary[0]?.returns || 0,
          inventoryValue,
          lowStockCount: lowStockProducts.length,
        },
        dailySales,
        monthlySales,
        profitReport: monthlySales,
        categorySales,
        productSales,
        cashierSales,
        customerSales,
        inventoryReport: {
          totalProducts: inventoryProducts.length,
          totalInventoryValue: inventoryValue,
          lowStockCount: lowStockProducts.length,
          products: inventoryProducts,
        },
        lowStockReport: lowStockProducts,
        refundReport: {
          summary: refundSummary[0] || { refundAmount: 0, returns: 0, returnedItems: 0 },
          reasons: refundReasons,
          methods: refundMethods,
        },
        discountReport: {
          byType: discountReport,
          coupons: couponReport,
        },
        taxReport,
        paymentMethodReport,
        stockMovement,
        insights,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
