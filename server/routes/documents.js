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

// PDF出力（仮実装）
router.get('/:id/pdf-mock', (req, res) => {
  try {
    const document = db.prepare(`
      SELECT d.*, c.name as customer_name, c.address, c.phone 
      FROM documents d 
      LEFT JOIN customers c ON d.customer_id = c.id 
      WHERE d.id = ?
    `).get(req.params.id);
    
    if (!document) return res.status(404).json({ error: 'Document not found' });
    
    const items = db.prepare('SELECT * FROM document_items WHERE document_id = ?').all(req.params.id);
    
    // 仮のHTML形式でPDF風の書類を生成
    const documentTypeLabel = {
      quotation: '見積書',
      order: '発注書',
      delivery: '納品書',
      invoice: '請求書'
    }[document.document_type] || document.document_type;
    
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTypeLabel} - ${document.document_number}</title>
  <style>
    body { font-family: 'MS Gothic', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: #f5f5f5; }
    .container { background: white; padding: 60px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #333; padding-bottom: 20px; }
    .header h1 { font-size: 32px; margin: 0; color: #333; }
    .header .doc-number { font-size: 14px; color: #666; margin-top: 10px; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { flex: 1; }
    .info-box h3 { font-size: 14px; margin-bottom: 10px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .info-box p { margin: 5px 0; font-size: 13px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    .items-table th { background: #333; color: white; padding: 12px; text-align: left; font-size: 13px; }
    .items-table td { padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 13px; }
    .items-table tr:hover { background: #f9f9f9; }
    .totals { margin-top: 30px; text-align: right; }
    .totals-table { display: inline-block; min-width: 300px; }
    .totals-table tr { border-bottom: 1px solid #ddd; }
    .totals-table td { padding: 10px 15px; font-size: 14px; }
    .totals-table .label { text-align: left; color: #666; }
    .totals-table .amount { text-align: right; font-weight: 600; }
    .totals-table .total-row { border-top: 2px solid #333; font-size: 18px; font-weight: 700; }
    .notes { margin-top: 40px; padding: 20px; background: #f9f9f9; border-left: 4px solid #1890ff; }
    .notes h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
    .notes p { margin: 0; font-size: 13px; line-height: 1.6; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
    .badge { display: inline-block; padding: 5px 15px; background: #1890ff; color: white; border-radius: 4px; font-size: 12px; margin-left: 10px; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${documentTypeLabel}</h1>
      <div class="doc-number">書類番号: ${document.document_number} <span class="badge">${document.status === 'issued' ? '発行済' : document.status === 'paid' ? '入金済' : '下書き'}</span></div>
    </div>
    
    <div class="info-section">
      <div class="info-box">
        <h3>お客様情報</h3>
        <p><strong>${document.customer_name || '-'}</strong></p>
        <p>${document.address || ''}</p>
        <p>${document.phone || ''}</p>
      </div>
      <div class="info-box">
        <h3>発行情報</h3>
        <p><strong>発行日:</strong> ${document.issue_date}</p>
        <p><strong>税区分:</strong> ${document.tax_type === 'exclusive' ? '外税' : '内税'}</p>
        <p><strong>消費税率:</strong> ${document.tax_rate}%</p>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">商品名</th>
          <th style="width: 15%; text-align: right;">数量</th>
          <th style="width: 20%; text-align: right;">単価</th>
          <th style="width: 15%; text-align: right;">金額</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>${item.item_name}</td>
          <td style="text-align: right;">${item.quantity}</td>
          <td style="text-align: right;">¥${item.unit_price.toLocaleString()}</td>
          <td style="text-align: right;">¥${item.amount.toLocaleString()}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td class="label">小計</td>
          <td class="amount">¥${document.subtotal.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="label">消費税 (${document.tax_rate}%)</td>
          <td class="amount">¥${document.tax_amount.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td class="label">合計金額</td>
          <td class="amount">¥${document.total_amount.toLocaleString()}</td>
        </tr>
      </table>
    </div>
    
    ${document.notes ? `
    <div class="notes">
      <h3>備考</h3>
      <p>${document.notes}</p>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>※ これは仮のPDF出力プレビューです（HTML形式）</p>
      <p>本番実装時は PDFlib または Puppeteer を使用してPDF生成を行います</p>
      <p style="margin-top: 20px;">発行元: 13湯麺集TSUDOI 受発注管理システム</p>
    </div>
  </div>
  
  <script>
    // 自動印刷プレビュー（オプション）
    // window.print();
  </script>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
