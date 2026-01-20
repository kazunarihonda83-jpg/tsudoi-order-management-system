import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const docs = db.prepare(`SELECT d.*, c.name as customer_name FROM documents d 
      LEFT JOIN customers c ON d.customer_id = c.id ORDER BY d.created_at DESC`).all();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    const items = db.prepare('SELECT * FROM document_items WHERE document_id = ?').all(req.params.id);
    res.json({ ...document, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get document' });
  }
});

router.post('/', (req, res) => {
  try {
    const { document_type, customer_id, issue_date, tax_type, tax_rate, items, notes } = req.body;
    let subtotal = 0;
    items.forEach(item => { subtotal += item.unit_price * item.quantity; });
    const taxAmount = Math.floor(subtotal * (tax_rate || 10) / 100);
    const totalAmount = subtotal + taxAmount;
    const today = new Date();
    const docNumber = `${document_type.charAt(0).toUpperCase()}${today.getFullYear().toString().slice(-2)}${(today.getMonth()+1).toString().padStart(2,'0')}${Date.now().toString().slice(-5)}`;
    const result = db.prepare(`INSERT INTO documents (document_number, document_type, customer_id, issue_date, 
      tax_type, tax_rate, subtotal, tax_amount, total_amount, notes, admin_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(docNumber, document_type, customer_id, issue_date, 
      tax_type || 'exclusive', tax_rate || 10, subtotal, taxAmount, totalAmount, notes, req.user.id);
    items.forEach(item => {
      db.prepare(`INSERT INTO document_items (document_id, product_name, quantity, unit_price, tax_category, subtotal) 
        VALUES (?, ?, ?, ?, ?, ?)`).run(result.lastInsertRowid, item.product_name, item.quantity, item.unit_price, 
        item.tax_category || 'standard', item.unit_price * item.quantity);
    });
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(document);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { document_type, customer_id, issue_date, tax_type, tax_rate, items, notes } = req.body;
    let subtotal = 0;
    items.forEach(item => { subtotal += item.unit_price * item.quantity; });
    const taxAmount = Math.floor(subtotal * (tax_rate || 10) / 100);
    const totalAmount = subtotal + taxAmount;
    db.prepare(`UPDATE documents SET document_type = ?, customer_id = ?, issue_date = ?, 
      tax_type = ?, tax_rate = ?, subtotal = ?, tax_amount = ?, total_amount = ?, notes = ? 
      WHERE id = ?`).run(document_type, customer_id, issue_date, tax_type || 'exclusive', 
      tax_rate || 10, subtotal, taxAmount, totalAmount, notes, req.params.id);
    db.prepare('DELETE FROM document_items WHERE document_id = ?').run(req.params.id);
    items.forEach(item => {
      db.prepare(`INSERT INTO document_items (document_id, product_name, quantity, unit_price, tax_category, subtotal) 
        VALUES (?, ?, ?, ?, ?, ?)`).run(req.params.id, item.product_name, item.quantity, item.unit_price, 
        item.tax_category || 'standard', item.unit_price * item.quantity);
    });
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
