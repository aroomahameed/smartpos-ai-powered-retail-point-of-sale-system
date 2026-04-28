import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/', (req, res) => {
  res.json({ message: '✅ POS API is running!' });
});

import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/product.routes';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// app.use('/api/products', productRoutes);
// app.use('/api/sales', saleRoutes);
// app.use('/api/customers', customerRoutes);
// app.use('/api/reports', reportRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;