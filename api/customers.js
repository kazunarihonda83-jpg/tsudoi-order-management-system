import express from 'express';
import cors from 'cors';
import customerRoutes from '../server/routes/customers.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/customers', customerRoutes);

export default app;
