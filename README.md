# SmartPOS - AI-Powered Point of Sale System

A modern Point of Sale system built with Angular, Node.js, Express, and MongoDB for retail businesses.
It includes sales management, inventory tracking, customer management, reporting, offline sales support, and AI-powered business insights.

SmartPOS is designed for grocery stores, pharmacies, cosmetics shops, food shops, and general retail businesses that need a complete checkout, inventory, and reporting workflow.

## Live Demo

Frontend Demo: your-demo-link
Admin Demo: your-demo-link

Demo Credentials:

Admin:
Email: admin@example.com
Password: admin123

Cashier:
Email: cashier@example.com
Password: cashier123

## Screenshots

Add screenshots here.

Suggested screenshots:

- Login page
- Admin dashboard
- POS checkout screen
- Inventory dashboard
- Reports and analytics page
- AI business assistant panel

## Features

- Modern admin dashboard with today's sales, today's profit, total orders, low stock items, top selling product, pending returns, total customers, and monthly revenue.
- POS checkout with product search, barcode-style scanning, product grid, cart panel, discounts, tax, split payment, and receipt printing.
- Hold and resume orders for paused checkout sessions.
- Refund and return flow with invoice search, item selection, return reasons, restock option, refund method, and return receipt.
- Discount and coupon management with percentage, fixed, product-level, category-level, loyalty, expiry date, and minimum bill logic.
- Inventory management with stock in, stock out, adjustment, transfer, damage/loss, supplier purchase, batch number, expiry date, reorder level, and inventory history.
- Supplier and purchase order management with supplier profiles, supplier products, purchase orders, invoices, payment status, due amount, and purchase history.
- Customer and loyalty management with customer profiles, purchase history, total spending, last purchase date, loyalty points, credit balance, favorite products, and customer types.
- Reports and analytics for sales, profit, category sales, product sales, cashier sales, customer sales, inventory, low stock, refunds, discounts, tax, and payment methods.
- Role-based access for Admin, Manager, Cashier, Inventory Staff, and Accountant.
- Audit logs for important business actions such as price changes, deleted invoices, discounts, refunds, and stock updates.
- Offline sales support with local queue, sync when internet returns, offline badge, and duplicate invoice prevention.
- Pagination, search, filters, PDF export, Excel export, and receipt printing.
- Jest unit tests for checkout calculations, services, guards, inventory logic, AI logic, and backend utilities.

## AI Features

- Sales forecasting using last 7 days, last 30 days, and same weekday averages.
- Smart reorder suggestions based on average daily sales, current stock, estimated stock-out days, and suggested reorder quantity.
- Product recommendations during checkout based on products often sold together.
- AI business assistant for admin questions such as:
  - What were my top selling products this week?
  - Which products are low in stock?
  - Which products should I reorder?
  - Which cashier made the most sales today?
  - Why did sales drop this week?
  - Show today's profit by category.

## Tech Stack

Frontend:

- Angular 17
- Angular Material
- RxJS signals
- Chart.js and ng2-charts
- IndexedDB for offline sales queue
- Service Worker and PWA manifest
- Jest with jest-preset-angular

Backend:

- Node.js
- Express 5
- TypeScript
- MongoDB
- Mongoose
- JWT authentication and refresh tokens
- bcryptjs
- Jest with ts-jest

Tools:

- npm
- TypeScript
- GitHub

## Project Architecture

SmartPOS is split into a frontend Angular app and a backend REST API.

```text
Frontend Angular App
  |
  |-- Auth, role guards, JWT interceptor
  |-- Admin layout and feature modules
  |-- POS checkout, reports, inventory, customers, suppliers
  |-- Offline sales queue and sync service
  |
Backend Express API
  |
  |-- Auth and role middleware
  |-- REST API modules
  |-- Mongoose models
  |-- Audit logging
  |-- AI calculation utilities
  |
MongoDB Database
  |
  |-- Users, products, sales, customers, returns
  |-- coupons, suppliers, purchase orders
  |-- inventory movements, audit logs
```

## Installation

Clone the repository:

```bash
git clone https://github.com/aroomahameed/smartpos-ai-powered-retail-point-of-sale-system.git
cd smartpos-ai-powered-retail-point-of-sale-system
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

Run the backend:

```bash
cd backend
npm run dev
```

Run the frontend:

```bash
cd frontend
npm start
```

Default local URLs:

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000`

## Environment Variables

Create a `.env` file inside the `backend` folder:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/smartpos
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
```

Required variables:

- `PORT` - Backend server port.
- `MONGO_URI` - MongoDB connection string.
- `JWT_SECRET` - Secret used to sign access tokens.
- `JWT_REFRESH_SECRET` - Secret used to sign refresh tokens.

## Usage

1. Start MongoDB.
2. Start the backend API with `npm run dev` from the `backend` folder.
3. Start the Angular frontend with `npm start` from the `frontend` folder.
4. Register or seed an admin user.
5. Add products, suppliers, customers, and inventory stock.
6. Use the POS screen to create sales, apply discounts, split payments, print receipts, hold orders, and process checkout.
7. Use reports and the AI assistant to review performance and reorder suggestions.

Useful test commands:

```bash
cd frontend
npm test

cd backend
npm test
```

Build commands:

```bash
cd frontend
npm run build -- --configuration development

cd backend
npm run build
```

## Folder Structure

```text
smartpos-ai-powered-retail-point-of-sale-system/
  backend/
    src/
      config/
      middleware/
      modules/
        auth/
        products/
        customers/
        sales/
        returns/
        coupons/
        inventory/
        suppliers/
        reports/
        audit-logs/
      app.ts
    package.json
    tsconfig.json

  frontend/
    src/
      app/
        core/
          auth/
          interceptors/
          models/
          services/
        features/
          auth/
          dashboard/
          pos/
          products/
          sales/
          customers/
          suppliers/
          reports/
          audit-logs/
        layouts/
        shared/
      manifest.webmanifest
      sw.js
    package.json
    angular.json
```

## API Modules

Backend API base URL:

```text
http://localhost:3000/api
```

Main modules:

- `/api/auth` - Login, register, refresh token, logout.
- `/api/products` - Product CRUD, product stock, pricing, batch, expiry, reorder level.
- `/api/customers` - Customer profiles, loyalty points, purchase history, favorite products.
- `/api/sales` - Sales, checkout, split payments, receipt data, product recommendations.
- `/api/returns` - Invoice search, item returns, refund receipt, restock handling.
- `/api/coupons` - Coupon validation and discount rules.
- `/api/inventory` - Stock in/out, adjustment, transfer, damage/loss, supplier purchase, inventory history.
- `/api/suppliers` - Supplier profiles, purchase orders, invoices, payment status.
- `/api/reports` - Dashboard stats, sales reports, exports, charts, AI assistant, sales forecast.
- `/api/audit-logs` - Important action tracking and audit history.

## Database Design

Main MongoDB collections:

- `users` - User accounts, roles, login credentials.
- `products` - Product catalog, SKU, barcode, stock, cost, price, category, batch, expiry, reorder level.
- `sales` - Sale invoices, items, totals, discounts, tax, payment method, split payments, customer, cashier.
- `customers` - Customer profile, customer type, loyalty points, total purchases, credit balance.
- `returns` - Return receipts, returned items, refund method, restock decision, return reasons.
- `coupons` - Coupon code, discount type, discount value, expiry date, minimum purchase amount.
- `inventorymovements` - Stock movement type, quantity, previous stock, new stock, batch, expiry, reference.
- `suppliers` - Supplier profile, contact details, products, purchase history.
- `purchaseorders` - Supplier purchase orders, received stock, payment status, due amount.
- `auditlogs` - User actions, entity type, before/after values, metadata, timestamps.

Key relationships:

- A sale belongs to a cashier and can belong to a customer.
- Sale items reference products and store snapshot pricing.
- Inventory movements reference products and the staff user who created them.
- Return receipts reference the original sale and returned products.
- Purchase orders reference suppliers and product line items.

## Roadmap

- Add hosted live demo links.
- Add screenshots and a short product walkthrough.
- Add seed script for demo users, products, suppliers, and sales.
- Add Docker setup for frontend, backend, and MongoDB.
- Add CI workflow for lint, test, and build checks.
- Add stronger e2e tests for checkout, returns, inventory, and reports.
- Add advanced AI forecasting with seasonal trends and category-level prediction.
- Add multi-branch and multi-store inventory support.
- Add barcode scanner hardware integration.

## What I Learned

- How to design a full retail POS workflow from checkout to reporting.
- How to connect role-based frontend navigation with protected backend API routes.
- How to calculate sales totals, discounts, taxes, split payments, refunds, and receipts safely.
- How to build offline-first sales behavior with local queueing and sync.
- How to structure inventory movement history for auditability.
- How to add simple AI-style business insights using existing sales and inventory data.
- How to add Jest tests for frontend calculations, Angular services, guards, backend utilities, and AI logic.

## Author

Arooma Hameed

GitHub: [@aroomahameed](https://github.com/aroomahameed)
