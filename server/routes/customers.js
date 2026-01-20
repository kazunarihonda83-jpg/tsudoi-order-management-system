import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const contacts = db.prepare('SELECT * FROM customer_contacts WHERE customer_id = ?').all(req.params.id);
    customer.contacts = contacts;
    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

router.post('/', (req, res) => {
  try {
    const { customer_type, name, postal_code, address, phone, email, payment_terms, notes } = req.body;
    if (!customer_type || !name) {
      return res.status(400).json({ error: 'Customer type and name are required' });
    }
    const result = db.prepare(`INSERT INTO customers (customer_type, name, postal_code, address, phone, email, payment_terms, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(customer_type, name, postal_code, address, phone, email, payment_terms || 30, notes);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { customer_type, name, postal_code, address, phone, email, payment_terms, notes } = req.body;
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    db.prepare(`UPDATE customers SET customer_type = ?, name = ?, postal_code = ?, address = ?, phone = ?, 
      email = ?, payment_terms = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(customer_type, name, postal_code, address, phone, email, payment_terms, notes, req.params.id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const documentCount = db.prepare('SELECT COUNT(*) as count FROM documents WHERE customer_id = ?').get(req.params.id);
    if (documentCount.count > 0) {
      return res.status(400).json({ error: `この顧客には${documentCount.count}件の書類が紐付いています。先に書類を削除してから顧客を削除してください。` });
    }
    db.prepare('DELETE FROM customer_contacts WHERE customer_id = ?').run(req.params.id);
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;
