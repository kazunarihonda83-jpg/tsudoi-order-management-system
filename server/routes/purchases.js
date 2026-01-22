import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { createJournalFromPurchaseOrder } from './accounting.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT po.*, s.name as supplier_name 
      FROM purchase_orders po 
      LEFT JOIN suppliers s ON po.supplier_id = s.id 
      ORDER BY po.order_date DESC
    `).all();
    res.json(orders);
  } catch (error) {
    console.error('Error getting purchase orders:', error);
    res.status(500).json({ error: 'Failed to get purchase orders' });
  }
});

// 発注データから発注書を生成（このルートは /orders/:id より前に配置）
router.post('/orders/:id/create-document', async (req, res) => {
  try {
    const order = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.address, s.phone, s.email
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    const items = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?').all(req.params.id);
    
    // 発注書番号を生成
    const today = new Date();
    const docNumber = `O${today.getFullYear().toString().slice(-2)}${(today.getMonth()+1).toString().padStart(2,'0')}${Date.now().toString().slice(-5)}`;
    
    // 仕入先を顧客として一時的に作成または取得
    let customer = db.prepare('SELECT * FROM customers WHERE name = ?').get(order.supplier_name);
    
    if (!customer) {
      const result = db.prepare(`
        INSERT INTO customers (customer_type, name, address, phone, email)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'supplier',  // 仕入先として登録
        order.supplier_name,
        order.address || '',
        order.phone || '',
        order.email || ''
      );
      customer = { id: result.lastInsertRowid };
    }
    
    // 発注書を作成
    const documentResult = db.prepare(`
      INSERT INTO documents (
        document_number, document_type, customer_id, issue_date,
        tax_type, tax_rate, subtotal, tax_amount, total_amount,
        notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docNumber,
      'order',
      customer.id,
      order.order_date,
      'exclusive',
      10,
      order.subtotal,
      order.tax_amount,
      order.total_amount,
      `発注番号: ${order.order_number}\n${order.notes || ''}`,
      'issued',
      req.user.id
    );
    
    // 明細を追加
    items.forEach(item => {
      db.prepare(`
        INSERT INTO document_items (document_id, item_name, quantity, unit_price, amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        documentResult.lastInsertRowid,
        item.item_name,
        item.quantity,
        item.unit_price,
        item.quantity * item.unit_price
      );
    });
    
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentResult.lastInsertRowid);
    res.status(201).json(document);
  } catch (error) {
    console.error('Create document from purchase order error:', error);
    res.status(500).json({ error: 'Failed to create document from purchase order' });
  }
});

router.get('/orders/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    
    const items = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?').all(req.params.id);
    res.json({ ...order, items });
  } catch (error) {
    console.error('Error getting purchase order:', error);
    res.status(500).json({ error: 'Failed to get purchase order' });
  }
});

router.post('/orders', (req, res) => {
  try {
    const { supplier_id, order_date, items, notes, status } = req.body;
    
    let subtotal = 0;
    items.forEach(item => { 
      subtotal += item.unit_price * item.quantity; 
    });
    
    const taxAmount = Math.floor(subtotal * 10 / 100);
    const totalAmount = subtotal + taxAmount;
    const orderNumber = `PO${new Date().getFullYear().toString().slice(-2)}${Date.now().toString().slice(-6)}`;
    
    // デフォルトで納品済みステータスにして自動仕訳を作成
    const finalStatus = status || 'delivered';
    
    const result = db.prepare(`
      INSERT INTO purchase_orders (
        order_number, supplier_id, order_date, 
        subtotal, tax_amount, total_amount, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber, 
      supplier_id, 
      order_date, 
      subtotal, 
      taxAmount, 
      totalAmount, 
      finalStatus, 
      notes, 
      req.user.id
    );
    
    items.forEach(item => {
      db.prepare(`
        INSERT INTO purchase_order_items (
          purchase_order_id, item_name, quantity, unit_price, amount
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        result.lastInsertRowid, 
        item.product_name, 
        item.quantity, 
        item.unit_price, 
        item.unit_price * item.quantity
      );
    });
    
    // 納品済みの場合、自動仕訳を作成
    if (finalStatus === 'delivered') {
      createJournalFromPurchaseOrder(result.lastInsertRowid);
    }
    
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      order_number: orderNumber 
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

router.put('/orders/:id', (req, res) => {
  try {
    const { supplier_id, order_date, items, notes, status, actual_delivery_date } = req.body;
    
    let subtotal = 0;
    items.forEach(item => { 
      subtotal += item.unit_price * item.quantity; 
    });
    
    const taxAmount = Math.floor(subtotal * 10 / 100);
    const totalAmount = subtotal + taxAmount;
    
    db.prepare(`
      UPDATE purchase_orders SET 
        supplier_id = ?, 
        order_date = ?, 
        subtotal = ?, 
        tax_amount = ?, 
        total_amount = ?, 
        notes = ?,
        status = ?,
        actual_delivery_date = ?
      WHERE id = ?
    `).run(
      supplier_id, 
      order_date, 
      subtotal, 
      taxAmount, 
      totalAmount, 
      notes,
      status || 'ordered',
      actual_delivery_date || null,
      req.params.id
    );
    
    db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(req.params.id);
    
    items.forEach(item => {
      db.prepare(`
        INSERT INTO purchase_order_items (
          purchase_order_id, item_name, quantity, unit_price, amount
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        req.params.id, 
        item.product_name, 
        item.quantity, 
        item.unit_price, 
        item.unit_price * item.quantity
      );
    });
    
    // 納品済みの場合、自動仕訳を更新
    if (status === 'delivered') {
      createJournalFromPurchaseOrder(req.params.id);
    }
    
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    res.json(order);
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

router.delete('/orders/:id', (req, res) => {
  try {
    // 関連する自動仕訳を削除
    db.prepare(`
      DELETE FROM journal_entries 
      WHERE reference_type = 'purchase_order' 
      AND reference_id = ?
    `).run(req.params.id);
    
    // 発注書と明細を削除
    db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(req.params.id);
    db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);
    
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

// ステータス更新専用エンドポイント
router.patch('/orders/:id/status', (req, res) => {
  try {
    const { status, actual_delivery_date } = req.body;
    
    db.prepare(`
      UPDATE purchase_orders SET 
        status = ?,
        actual_delivery_date = ?
      WHERE id = ?
    `).run(status, actual_delivery_date || null, req.params.id);
    
    // 納品済みに変更された場合、自動仕訳を作成
    if (status === 'delivered') {
      createJournalFromPurchaseOrder(req.params.id);
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
