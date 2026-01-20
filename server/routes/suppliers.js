import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC').all();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suppliers' });
  }
});

router.post('/', (req, res) => {
  try {
    const { 
      supplier_type, name, postal_code, address, phone, email, payment_terms,
      bank_name, branch_name, account_type, account_number, account_holder, notes 
    } = req.body;
    const result = db.prepare(`
      INSERT INTO suppliers (
        supplier_type, name, postal_code, address, phone, email, payment_terms,
        bank_name, branch_name, account_type, account_number, account_holder, notes
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      supplier_type, name, postal_code, address, phone, email, payment_terms || 30,
      bank_name, branch_name, account_type, account_number, account_holder, notes
    );
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Failed to create supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { 
      supplier_type, name, postal_code, address, phone, email, payment_terms,
      bank_name, branch_name, account_type, account_number, account_holder, notes 
    } = req.body;
    db.prepare(`
      UPDATE suppliers SET 
        supplier_type = ?, name = ?, postal_code = ?, address = ?, phone = ?, email = ?, payment_terms = ?,
        bank_name = ?, branch_name = ?, account_type = ?, account_number = ?, account_holder = ?,
        notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      supplier_type, name, postal_code, address, phone, email, payment_terms || 30,
      bank_name, branch_name, account_type, account_number, account_holder,
      notes, req.params.id
    );
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    res.json(supplier);
  } catch (error) {
    console.error('Failed to update supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?').get(req.params.id);
    if (orderCount.count > 0) {
      return res.status(400).json({ error: `この仕入先には${orderCount.count}件の発注が紐付いています。` });
    }
    db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

export default router;
