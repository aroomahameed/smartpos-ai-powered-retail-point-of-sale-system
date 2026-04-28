import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customer.controller';
import { protect } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// @route   GET /api/customers
router.get('/', protect, getCustomers);

// @route   GET /api/customers/:id
router.get('/:id', protect, getCustomerById);

// @route   POST /api/customers
router.post('/', protect, requireRole('admin', 'manager', 'cashier'), createCustomer);

// @route   PUT /api/customers/:id
router.put('/:id', protect, requireRole('admin', 'manager'), updateCustomer);

// @route   DELETE /api/customers/:id
router.delete('/:id', protect, requireRole('admin'), deleteCustomer);

export default router;