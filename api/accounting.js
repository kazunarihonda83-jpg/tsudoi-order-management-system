import express from 'express';
import cors from 'cors';
import accountingRoutes from '../server/routes/accounting.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/accounting', accountingRoutes);

export default app;
