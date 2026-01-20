import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.js';
import customersRoutes from './routes/customers.js';
import documentsRoutes from './routes/documents.js';
import suppliersRoutes from './routes/suppliers.js';
import purchasesRoutes from './routes/purchases.js';
import accountingRoutes from './routes/accounting.js';
import inventoryRoutes from './routes/inventory.js';
import expensesRoutes from './routes/expenses.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expensesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Handle SPA routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
