import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { createJournalFromDocument } from './accounting.js';

const router = express.Router();

// 書類HTML生成関数
function generateDocumentHTML(document, items, isPreview = false) {
  const documentTypeLabel = {
    quotation: '御見積書',
    order: '発注書',
    delivery: '納品書',
    invoice: '御請求書'
  }[document.document_type] || document.document_type;
  
  const statusLabel = {
    draft: '下書き',
    issued: '発行済',
    paid: '入金済',
    delivered: '納品済'
  }[document.status] || document.status;
  
  const documentTypeColor = {
    quotation: '#1890ff',
    order: '#722ed1',
    delivery: '#13c2c2',
    invoice: '#52c41a'
  }[document.document_type] || '#1890ff';
  
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTypeLabel} - ${document.document_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; 
      background: #f0f2f5; 
      padding: 40px 20px;
    }
    .page { 
      max-width: 210mm; 
      min-height: 297mm; 
      margin: 0 auto; 
      background: white; 
      padding: 20mm; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      color: rgba(255, 77, 79, 0.08);
      font-weight: bold;
      z-index: 0;
      pointer-events: none;
      display: ${document.status === 'draft' ? 'block' : 'none'};
    }
    .content { position: relative; z-index: 1; }
    
    /* ヘッダー */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${documentTypeColor};
    }
    .header-left { flex: 1; }
    .header-right { text-align: right; }
    .company-name { 
      font-size: 24px; 
      font-weight: bold; 
      color: #333;
      margin-bottom: 8px;
    }
    .company-info { 
      font-size: 11px; 
      color: #666; 
      line-height: 1.6;
    }
    .doc-title { 
      font-size: 32px; 
      font-weight: bold; 
      color: ${documentTypeColor};
      margin-bottom: 8px;
    }
    .doc-number { 
      font-size: 13px; 
      color: #666;
      font-family: 'Courier New', monospace;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      background: ${document.status === 'issued' ? '#52c41a' : document.status === 'paid' ? '#1890ff' : '#d9d9d9'};
      color: white;
      border-radius: 4px;
      font-size: 11px;
      margin-top: 8px;
    }
    
    /* 宛先セクション */
    .recipient-section {
      margin-bottom: 30px;
      padding: 20px;
      background: #fafafa;
      border-left: 4px solid ${documentTypeColor};
    }
    .recipient-label {
      font-size: 12px;
      color: #999;
      margin-bottom: 8px;
    }
    .recipient-name {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      margin-bottom: 12px;
    }
    .recipient-details {
      font-size: 12px;
      color: #666;
      line-height: 1.8;
    }
    
    /* 金額サマリー */
    .amount-summary {
      float: right;
      width: 280px;
      margin: 20px 0 30px 0;
      border: 2px solid ${documentTypeColor};
      border-radius: 8px;
      overflow: hidden;
    }
    .amount-header {
      background: ${documentTypeColor};
      color: white;
      padding: 12px;
      text-align: center;
      font-size: 14px;
      font-weight: bold;
    }
    .amount-body {
      padding: 15px;
      background: white;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .amount-row.total {
      border-top: 2px solid ${documentTypeColor};
      border-bottom: none;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 18px;
      font-weight: bold;
      color: ${documentTypeColor};
    }
    .amount-label { color: #666; }
    .amount-value { 
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }
    
    /* 発行情報 */
    .issue-info {
      clear: both;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
      padding: 15px;
      background: #fafafa;
      border-radius: 4px;
    }
    .info-item {
      font-size: 12px;
    }
    .info-label {
      color: #999;
      margin-bottom: 4px;
    }
    .info-value {
      color: #333;
      font-weight: 600;
    }
    
    /* 明細テーブル */
    .items-section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${documentTypeColor};
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .items-table thead {
      background: ${documentTypeColor};
      color: white;
    }
    .items-table th {
      padding: 12px 10px;
      text-align: left;
      font-weight: 600;
    }
    .items-table th.center { text-align: center; }
    .items-table th.right { text-align: right; }
    .items-table tbody tr {
      border-bottom: 1px solid #f0f0f0;
    }
    .items-table tbody tr:hover {
      background: #fafafa;
    }
    .items-table td {
      padding: 12px 10px;
      color: #333;
    }
    .items-table td.center { text-align: center; }
    .items-table td.right { 
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .item-number {
      color: #999;
      font-size: 11px;
    }
    
    /* 備考 */
    .notes-section {
      margin: 30px 0;
      padding: 20px;
      background: #fffbe6;
      border-left: 4px solid #faad14;
      border-radius: 4px;
    }
    .notes-title {
      font-size: 13px;
      font-weight: bold;
      color: #ad6800;
      margin-bottom: 8px;
    }
    .notes-content {
      font-size: 12px;
      color: #666;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    
    /* フッター */
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #d9d9d9;
      text-align: center;
      font-size: 11px;
      color: #999;
    }
    .footer-actions {
      margin-top: 30px;
      display: ${isPreview ? 'flex' : 'none'};
      gap: 10px;
      justify-content: center;
    }
    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    .btn-primary {
      background: ${documentTypeColor};
      color: white;
    }
    .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn-secondary {
      background: white;
      color: #666;
      border: 1px solid #d9d9d9;
    }
    .btn-secondary:hover {
      border-color: ${documentTypeColor};
      color: ${documentTypeColor};
    }
    
    @media print {
      body { background: white; padding: 0; }
      .page { 
        box-shadow: none; 
        margin: 0;
        padding: 15mm;
      }
      .footer-actions { display: none !important; }
    }
  </style>
  ${!isPreview ? `
  <script>
    // PDF出力時に自動的に印刷ダイアログを開く
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
  ` : ''}
</head>
<body>
  <div class="page">
    <div class="watermark">下書き</div>
    <div class="content">
      <!-- ヘッダー -->
      <div class="header">
        <div class="header-left">
          <div class="company-name">13湯麺　集TSUDOI</div>
          <div class="company-info">
            〒273-0137 千葉県鎌ヶ谷市道野辺本町2-22-1<br>
            TEL: 090-9383-8430<br>
            Email: （メールアドレス未設定）<br>
            HP: <a href="https://tabelog.com/chiba/A1203/A120303/12061712/" style="color: inherit;">https://tabelog.com/chiba/A1203/A120303/12061712/</a>
          </div>
        </div>
        <div class="header-right">
          <div class="doc-title">${documentTypeLabel}</div>
          <div class="doc-number">No. ${document.document_number}</div>
          <div class="status-badge">${statusLabel}</div>
        </div>
      </div>
      
      <!-- 宛先 -->
      <div class="recipient-section">
        <div class="recipient-label">宛先</div>
        <div class="recipient-name">${document.customer_name || '－'} 様</div>
        <div class="recipient-details">
          ${document.address ? `<div>〒 ${document.address}</div>` : ''}
          ${document.phone ? `<div>TEL: ${document.phone}</div>` : ''}
          ${document.email ? `<div>Email: ${document.email}</div>` : ''}
        </div>
      </div>
      
      <!-- 金額サマリー -->
      <div class="amount-summary">
        <div class="amount-header">ご${document.document_type === 'invoice' ? '請求' : document.document_type === 'quotation' ? '見積' : ''}金額</div>
        <div class="amount-body">
          <div class="amount-row">
            <span class="amount-label">小計</span>
            <span class="amount-value">¥${(document.subtotal || 0).toLocaleString()}</span>
          </div>
          <div class="amount-row">
            <span class="amount-label">消費税 (${document.tax_rate || 10}%)</span>
            <span class="amount-value">¥${(document.tax_amount || 0).toLocaleString()}</span>
          </div>
          <div class="amount-row total">
            <span class="amount-label">合計</span>
            <span class="amount-value">¥${(document.total_amount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <!-- 発行情報 -->
      <div class="issue-info">
        <div class="info-item">
          <div class="info-label">発行日</div>
          <div class="info-value">${document.issue_date || '－'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">税区分</div>
          <div class="info-value">${document.tax_type === 'exclusive' ? '外税' : '内税'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">有効期限</div>
          <div class="info-value">${document.valid_until || '－'}</div>
        </div>
      </div>
      
      <!-- 明細 -->
      <div class="items-section">
        <div class="section-title">明細</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 8%;" class="center">No.</th>
              <th style="width: 42%;">商品名・サービス</th>
              <th style="width: 12%;" class="center">数量</th>
              <th style="width: 18%;" class="right">単価</th>
              <th style="width: 20%;" class="right">金額</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
            <tr>
              <td class="center item-number">${index + 1}</td>
              <td>${item.item_name || '－'}</td>
              <td class="center">${item.quantity || 0}</td>
              <td class="right">¥${(item.unit_price || 0).toLocaleString()}</td>
              <td class="right">¥${(item.amount || 0).toLocaleString()}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- 備考 -->
      ${document.notes ? `
      <div class="notes-section">
        <div class="notes-title">備考</div>
        <div class="notes-content">${document.notes}</div>
      </div>
      ` : ''}
      
      <!-- フッター -->
      <div class="footer">
        <div>この書類に関するお問い合わせは、上記連絡先までお願いいたします。</div>
        <div style="margin-top: 8px;">発行元: 13湯麺　集TSUDOI 受発注管理システム</div>
        
        ${isPreview ? `
        <div class="footer-actions">
          <button class="btn btn-secondary" onclick="window.close()">閉じる</button>
          <button class="btn btn-primary" onclick="window.print()">印刷する</button>
        </div>
        ` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

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
    const { document_type, customer_id, issue_date, valid_until, tax_type, tax_rate, items, notes, status } = req.body;
    
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
        document_number, document_type, customer_id, issue_date, valid_until,
        tax_type, tax_rate, subtotal, tax_amount, total_amount, 
        notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docNumber, 
      document_type, 
      customer_id, 
      issue_date,
      valid_until || null,
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
    const { document_type, customer_id, issue_date, valid_until, tax_type, tax_rate, items, notes, status, payment_date } = req.body;
    
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
        valid_until = ?,
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
      valid_until || null,
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

// プレビュー表示
router.get('/:id/preview', (req, res) => {
  try {
    const document = db.prepare(`
      SELECT d.*, c.name as customer_name, c.address, c.phone, c.email
      FROM documents d 
      LEFT JOIN customers c ON d.customer_id = c.id 
      WHERE d.id = ?
    `).get(req.params.id);
    
    if (!document) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>エラー</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ff4d4f;">書類が見つかりません</h1>
          <p>指定された書類は存在しないか、削除されています。</p>
        </body></html>
      `);
    }
    
    const items = db.prepare('SELECT * FROM document_items WHERE document_id = ?').all(req.params.id);
    const html = generateDocumentHTML(document, items, true);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).send('プレビュー生成エラー');
  }
});

// PDF出力
router.get('/:id/pdf', (req, res) => {
  try {
    const document = db.prepare(`
      SELECT d.*, c.name as customer_name, c.address, c.phone, c.email
      FROM documents d 
      LEFT JOIN customers c ON d.customer_id = c.id 
      WHERE d.id = ?
    `).get(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const items = db.prepare('SELECT * FROM document_items WHERE document_id = ?').all(req.params.id);
    const html = generateDocumentHTML(document, items, false);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${document.document_number}.html"`);
    res.send(html);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
