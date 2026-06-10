import { Router } from 'express';
import {
  createInventoryMovement,
  getInventoryDashboard,
  getInventoryHistory,
} from './inventory.controller';
import { protect } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.get(
  '/dashboard',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  getInventoryDashboard
);

router.get(
  '/history',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  getInventoryHistory
);

router.post(
  '/movements',
  protect,
  requireRole('admin', 'manager'),
  createInventoryMovement
);

export default router;
