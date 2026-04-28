import { Router } from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  refundSale,
} from './sale.controller';
import { protect } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// @route   POST /api/sales
router.post(
  '/',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  createSale
);

// @route   GET /api/sales
router.get(
  '/',
  protect,
  requireRole('admin', 'manager'),
  getSales
);

// @route   GET /api/sales/:id
router.get(
  '/:id',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  getSaleById
);

// @route   PUT /api/sales/:id/refund
router.put(
  '/:id/refund',
  protect,
  requireRole('admin', 'manager'),
  refundSale
);

export default router;