import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from './product.controller';
import { protect } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// @route   GET /api/products
router.get('/', protect, getProducts);

// @route   GET /api/products/:id
router.get('/:id', protect, getProductById);

// @route   POST /api/products
router.post('/', protect, requireRole('admin', 'manager'), createProduct);

// @route   PUT /api/products/:id
router.put('/:id', protect, requireRole('admin', 'manager'), updateProduct);

// @route   DELETE /api/products/:id
router.delete('/:id', protect, requireRole('admin'), deleteProduct);

export default router;