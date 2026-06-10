import { Request, Response } from 'express';
import Product from './product.model';

// @route   GET /api/products
// @access  Private
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, lowStock } = req.query;

    let query: any = { isActive: true };

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (lowStock) query.$expr = { $lte: ['$stock', '$lowStockAlert'] };

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      message: '✅ Products fetched successfully',
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || !product.isActive) {
      res.status(404).json({ message: '❌ Product not found' });
      return;
    }

    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   POST /api/products
// @access  Private - Admin, Manager
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      sku,
      barcode,
      price,
      cost,
      stock,
      lowStockAlert,
      reorderLevel,
      category,
      unit,
      supplier,
      location,
      batchNumber,
      expiryDate,
    } = req.body;

    const existing = await Product.findOne({ sku });
    if (existing) {
      res.status(400).json({ message: '❌ SKU already exists' });
      return;
    }

    const product = await Product.create({
      name, sku, barcode, price, cost,
      stock, lowStockAlert, reorderLevel,
      category, unit, supplier, location, batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    res.status(201).json({
      message: '✅ Product created successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   PUT /api/products/:id
// @access  Private - Admin, Manager
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({ message: '❌ Product not found' });
      return;
    }

    res.status(200).json({
      message: '✅ Product updated successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   DELETE /api/products/:id
// @access  Private - Admin only
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      res.status(404).json({ message: '❌ Product not found' });
      return;
    }

    res.status(200).json({ message: '✅ Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};
