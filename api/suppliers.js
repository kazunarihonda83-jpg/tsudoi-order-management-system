import express from 'express';
import cors from 'cors';
import supplierRoutes from '../server/routes/suppliers.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/suppliers', supplierRoutes);

export default app;
