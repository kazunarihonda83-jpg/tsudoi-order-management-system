import express from 'express';
import cors from 'cors';
import purchaseRoutes from '../server/routes/purchases.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/purchases', purchaseRoutes);

export default app;
