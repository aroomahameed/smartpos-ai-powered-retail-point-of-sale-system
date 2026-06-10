import { Router } from 'express';
import {
  getDashboardStats,
  getSalesReport,
  getInventoryReport,
  getAnalyticsReport,
} from './report.controller';
import { protect } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// @route   GET /api/reports/dashboard
router.get(
  '/dashboard',
  protect,
  requireRole('admin', 'manager'),
  getDashboardStats
);

// @route   GET /api/reports/sales
router.get(
  '/sales',
  protect,
  requireRole('admin', 'manager'),
  getSalesReport
);

// @route   GET /api/reports/inventory
router.get(
  '/inventory',
  protect,
  requireRole('admin', 'manager'),
  getInventoryReport
);

// @route   GET /api/reports/analytics
router.get(
  '/analytics',
  protect,
  requireRole('admin', 'manager'),
  getAnalyticsReport
);

export default router;
