import { Router } from 'express';
import {
  createReturn,
  searchReturnInvoice,
} from './return.controller';
import { protect } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.get(
  '/invoice/:invoiceNumber',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  searchReturnInvoice
);

router.post(
  '/',
  protect,
  requireRole('admin', 'manager', 'cashier'),
  createReturn
);

export default router;
