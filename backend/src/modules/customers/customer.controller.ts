import { Request, Response } from 'express';
import Customer from './customer.model';

// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;

    let query: any = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      message: '✅ Customers fetched successfully',
      count: customers.length,
      customers,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   GET /api/customers/:id
// @access  Private
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer || !customer.isActive) {
      res.status(404).json({ message: '❌ Customer not found' });
      return;
    }

    res.status(200).json({ customer });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   POST /api/customers
// @access  Private
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, address } = req.body;

    const existing = await Customer.findOne({ phone });
    if (existing) {
      res.status(400).json({ message: '❌ Phone number already exists' });
      return;
    }

    const customer = await Customer.create({ name, email, phone, address });

    res.status(201).json({
      message: '✅ Customer created successfully',
      customer,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!customer) {
      res.status(404).json({ message: '❌ Customer not found' });
      return;
    }

    res.status(200).json({
      message: '✅ Customer updated successfully',
      customer,
    });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};

// @route   DELETE /api/customers/:id
// @access  Private - Admin only
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      res.status(404).json({ message: '❌ Customer not found' });
      return;
    }

    res.status(200).json({ message: '✅ Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: '❌ Server error', error });
  }
};