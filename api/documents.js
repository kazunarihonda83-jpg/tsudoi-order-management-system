import express from 'express';
import cors from 'cors';
import documentRoutes from '../server/routes/documents.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/documents', documentRoutes);

export default app;
