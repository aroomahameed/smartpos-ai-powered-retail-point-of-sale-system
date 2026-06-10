import { Router } from 'express';
import {
  createPurchaseOrder,
  createSupplier,
  deleteSupplier,
  getPurchaseOrders,
  getSupplierProfile,
  getSuppliers,
  receivePurchaseOrder,
  updatePaymentStatus,
  updateSupplier,
} from './supplier.controller';
import { protect } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.get(
  '/',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  getSuppliers
);

router.get(
  '/purchase-orders',
  protect,
  requireRole('admin', 'manager'),
  getPurchaseOrders
);

router.post(
  '/purchase-orders',
  protect,
  requireRole('admin', 'manager'),
  createPurchaseOrder
);

router.put(
  '/purchase-orders/:id/receive',
  protect,
  requireRole('admin', 'manager'),
  receivePurchaseOrder
);

router.put(
  '/purchase-orders/:id/payment',
  protect,
  requireRole('admin', 'manager'),
  updatePaymentStatus
);

router.get(
  '/:id/profile',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  getSupplierProfile
);

router.post(
  '/',
  protect,
  requireRole('admin', 'manager'),
  createSupplier
);

router.put(
  '/:id',
  protect,
  requireRole('admin', 'manager'),
  updateSupplier
);

router.delete(
  '/:id',
  protect,
  requireRole('admin'),
  deleteSupplier
);

export default router;
