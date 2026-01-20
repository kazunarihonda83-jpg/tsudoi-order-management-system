import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { createJournalFromDocument } from './accounting.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, c.name as customer_name 
      FROM documents d 
      LEFT JOIN customers c ON d.customer_id = c.id 
      ORDER BY d.created_at DESC
    `).all();
    res.json(docs);
  } catch (error) {
    console.error('Error getting documents:', error);
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
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

router.post('/', (req, res) => {
  try {
    const { document_type, customer_id, issue_date, tax_type, tax_rate, items, notes, status } = req.body;
    
    let subtotal = 0;
    items.forEach(item => { 
      subtotal += item.unit_price * item.quantity; 
    });
    
    const taxAmount = Math.floor(subtotal * (tax_rate || 10) / 100);
    const totalAmount = subtotal + taxAmount;
    const today = new Date();
    const docNumber = `${document_type.charAt(0).toUpperCase()}${today.getFullYear().toString().slice(-2)}${(today.getMonth()+1).toString().padStart(2,'0')}${Date.now().toString().slice(-5)}`;
    
    // 請求書の場合はデフォルトで発行済み、それ以外は下書き
    const finalStatus = status || (document_type === 'invoice' ? 'issued' : 'draft');
    
    const result = db.prepare(`
      INSERT INTO documents (
        document_number, document_type, customer_id, issue_date, 
        tax_type, tax_rate, subtotal, tax_amount, total_amount, 
        notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docNumber, 
      document_type, 
      customer_id, 
      issue_date, 
      tax_type || 'exclusive', 
      tax_rate || 10, 
      subtotal, 
      taxAmount, 
      totalAmount, 
      notes, 
      finalStatus,
      req.user.id
    );
    
    items.forEach(item => {
      db.prepare(`
        INSERT INTO document_items (
          document_id, item_name, quantity, unit_price, amount
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        result.lastInsertRowid, 
        item.product_name, 
        item.quantity, 
        item.unit_price, 
        item.unit_price * item.quantity
      );
    });
    
    // 請求書の場合、自動仕訳を作成
    if (document_type === 'invoice' && finalStatus === 'issued') {
      createJournalFromDocument(result.lastInsertRowid, document_type);
    }
    
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(document);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { document_type, customer_id, issue_date, tax_type, tax_rate, items, notes, status, payment_date } = req.body;
    
    let subtotal = 0;
    items.forEach(item => { 
      subtotal += item.unit_price * item.quantity; 
    });
    
    const taxAmount = Math.floor(subtotal * (tax_rate || 10) / 100);
    const totalAmount = subtotal + taxAmount;
    
    db.prepare(`
      UPDATE documents SET 
        document_type = ?, 
        customer_id = ?, 
        issue_date = ?, 
        tax_type = ?, 
        tax_rate = ?, 
        subtotal = ?, 
        tax_amount = ?, 
        total_amount = ?, 
        notes = ?,
        status = ?,
        payment_date = ?
      WHERE id = ?
    `).run(
      document_type, 
      customer_id, 
      issue_date, 
      tax_type || 'exclusive', 
      tax_rate || 10, 
      subtotal, 
      taxAmount, 
      totalAmount, 
      notes,
      status || 'draft',
      payment_date || null,
      req.params.id
    );
    
    db.prepare('DELETE FROM document_items WHERE document_id = ?').run(req.params.id);
    
    items.forEach(item => {
      db.prepare(`
        INSERT INTO document_items (
          document_id, item_name, quantity, unit_price, amount
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        req.params.id, 
        item.product_name, 
        item.quantity, 
        item.unit_price, 
        item.unit_price * item.quantity
      );
    });
    
    // 請求書の場合、自動仕訳を更新
    if (document_type === 'invoice') {
      createJournalFromDocument(req.params.id, document_type);
    }
    
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    // 関連する自動仕訳を削除
    db.prepare(`
      DELETE FROM journal_entries 
      WHERE reference_type IN ('document', 'document_payment') 
      AND reference_id = ?
    `).run(req.params.id);
    
    // 書類を削除
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ステータス更新専用エンドポイント
router.patch('/:id/status', (req, res) => {
  try {
    const { status, payment_date } = req.body;
    
    db.prepare(`
      UPDATE documents SET 
        status = ?,
        payment_date = ?
      WHERE id = ?
    `).run(status, payment_date || null, req.params.id);
    
    const document = db.prepare('SELECT document_type FROM documents WHERE id = ?').get(req.params.id);
    
    // ステータス変更時に自動仕訳を更新
    if (document && document.document_type === 'invoice') {
      createJournalFromDocument(req.params.id, document.document_type);
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
