import express from 'express';
import cors from 'cors';

// Import routes
import authRoutes from '../server/routes/auth.js';
import customerRoutes from '../server/routes/customers.js';
import documentRoutes from '../server/routes/documents.js';
import supplierRoutes from '../server/routes/suppliers.js';
import purchaseRoutes from '../server/routes/purchases.js';
import accountingRoutes from '../server/routes/accounting.js';
import inventoryRoutes from '../server/routes/inventory.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/inventory', inventoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Vercel serverless function handler
export default (req, res) => {
  return app(req, res);
};
