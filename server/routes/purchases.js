import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
router.use(authenticateToken);

router.get('/orders', (req, res) => {
  try {
    const orders = db.prepare(`SELECT po.*, s.name as supplier_name FROM purchase_orders po 
      LEFT JOIN suppliers s ON po.supplier_id = s.id ORDER BY po.order_date DESC`).all();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get purchase orders' });
  }
});

router.get('/orders/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    const items = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?').all(req.params.id);
    res.json({ ...order, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get purchase order' });
  }
});

router.post('/orders', (req, res) => {
  try {
    const { supplier_id, order_date, items, notes } = req.body;
    let subtotal = 0;
    items.forEach(item => { subtotal += item.unit_price * item.quantity; });
    const taxAmount = Math.floor(subtotal * 10 / 100);
    const totalAmount = subtotal + taxAmount;
    const orderNumber = `PO${new Date().getFullYear().toString().slice(-2)}${Date.now().toString().slice(-6)}`;
    const result = db.prepare(`INSERT INTO purchase_orders (order_number, supplier_id, order_date, tax_type, tax_rate, 
      subtotal, tax_amount, total_amount, status, notes, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(orderNumber, supplier_id, order_date, 'exclusive', 10, subtotal, taxAmount, totalAmount, 'draft', notes, req.user.id);
    items.forEach(item => {
      db.prepare(`INSERT INTO purchase_order_items (purchase_order_id, product_name, quantity, unit_price, tax_category, subtotal) 
        VALUES (?, ?, ?, ?, ?, ?)`).run(result.lastInsertRowid, item.product_name, item.quantity, item.unit_price, 'standard', item.unit_price * item.quantity);
    });
    res.status(201).json({ id: result.lastInsertRowid, order_number: orderNumber });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

router.put('/orders/:id', (req, res) => {
  try {
    const { supplier_id, order_date, items, notes } = req.body;
    let subtotal = 0;
    items.forEach(item => { subtotal += item.unit_price * item.quantity; });
    const taxAmount = Math.floor(subtotal * 10 / 100);
    const totalAmount = subtotal + taxAmount;
    db.prepare(`UPDATE purchase_orders SET supplier_id = ?, order_date = ?, 
      subtotal = ?, tax_amount = ?, total_amount = ?, notes = ? WHERE id = ?`)
      .run(supplier_id, order_date, subtotal, taxAmount, totalAmount, notes, req.params.id);
    db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(req.params.id);
    items.forEach(item => {
      db.prepare(`INSERT INTO purchase_order_items (purchase_order_id, product_name, quantity, unit_price, tax_category, subtotal) 
        VALUES (?, ?, ?, ?, ?, ?)`).run(req.params.id, item.product_name, item.quantity, item.unit_price, 'standard', item.unit_price * item.quantity);
    });
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    res.json(order);
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

router.delete('/orders/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(req.params.id);
    db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

export default router;
