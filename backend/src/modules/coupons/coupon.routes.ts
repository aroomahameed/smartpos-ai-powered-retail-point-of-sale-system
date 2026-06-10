import { Router } from 'express';
import { createCoupon, validateCoupon } from './coupon.controller';
import { protect } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.post(
  '/validate',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  validateCoupon
);

router.post(
  '/',
  protect,
  requireRole('admin', 'manager'),
  createCoupon
);

export default router;
