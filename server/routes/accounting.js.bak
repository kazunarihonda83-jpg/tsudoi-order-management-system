import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// PDFエンドポイント（認証不要）
// 損益計算書PDF生成
router.get('/profit-loss/pdf', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params = [];
    
    let dateFilter = '';
    if (start_date) { 
      dateFilter += ' AND je.entry_date >= ?';
      params.push(start_date);
    }
    if (end_date) { 
      dateFilter += ' AND je.entry_date <= ?';
      params.push(end_date);
    }
    
    // 収益の詳細（勘定科目別）
    const revenueDetails = db.prepare(`
      SELECT a.account_code, a.account_name, COALESCE(SUM(je.amount), 0) as amount
      FROM journal_entries je 
      JOIN accounts a ON je.credit_account_id = a.id 
      WHERE a.account_type = 'revenue' ${dateFilter}
      GROUP BY a.id, a.account_code, a.account_name
      ORDER BY a.account_code
    `).all(...params);
    
    // 費用の詳細（勘定科目別）
    const expenseDetails = db.prepare(`
      SELECT a.account_code, a.account_name, COALESCE(SUM(je.amount), 0) as amount
      FROM journal_entries je 
      JOIN accounts a ON je.debit_account_id = a.id 
      WHERE a.account_type = 'expense' ${dateFilter}
      GROUP BY a.id, a.account_code, a.account_name
      ORDER BY a.account_code
    `).all(...params);
    
    const revenueTotal = revenueDetails.reduce((sum, item) => sum + item.amount, 0);
    const expensesTotal = expenseDetails.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = revenueTotal - expensesTotal;
    
    const html = generateProfitLossHTML(revenueDetails, expenseDetails, revenueTotal, expensesTotal, netIncome, start_date, end_date);
    res.send(html);
  } catch (error) {
    console.error('Error generating profit-loss PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// 貸借対照表PDF生成
router.get('/balance-sheet/pdf', (req, res) => {
  try {
    const { as_of_date } = req.query;
    const dateFilter = as_of_date ? ' AND je.entry_date <= ?' : '';
    const params = as_of_date ? [as_of_date] : [];
    
    // 資産の詳細（勘定科目別）
    const assetDetails = db.prepare(`
      SELECT a.account_code, a.account_name,
             COALESCE(SUM(CASE WHEN je.debit_account_id = a.id THEN je.amount ELSE 0 END), 0) -
             COALESCE(SUM(CASE WHEN je.credit_account_id = a.id THEN je.amount ELSE 0 END), 0) as amount
      FROM accounts a
      LEFT JOIN journal_entries je ON (je.debit_account_id = a.id OR je.credit_account_id = a.id) ${dateFilter}
      WHERE a.account_type = 'asset'
      GROUP BY a.id, a.account_code, a.account_name
      HAVING amount != 0
      ORDER BY a.account_code
    `).all(...params);
    
    // 負債の詳細（勘定科目別）
    const liabilityDetails = db.prepare(`
      SELECT a.account_code, a.account_name,
             COALESCE(SUM(CASE WHEN je.credit_account_id = a.id THEN je.amount ELSE 0 END), 0) -
             COALESCE(SUM(CASE WHEN je.debit_account_id = a.id THEN je.amount ELSE 0 END), 0) as amount
      FROM accounts a
      LEFT JOIN journal_entries je ON (je.debit_account_id = a.id OR je.credit_account_id = a.id) ${dateFilter}
      WHERE a.account_type = 'liability'
      GROUP BY a.id, a.account_code, a.account_name
      HAVING amount != 0
      ORDER BY a.account_code
    `).all(...params);
    
    // 純資産の詳細（勘定科目別）
    const equityDetails = db.prepare(`
      SELECT a.account_code, a.account_name,
             COALESCE(SUM(CASE WHEN je.credit_account_id = a.id THEN je.amount ELSE 0 END), 0) -
             COALESCE(SUM(CASE WHEN je.debit_account_id = a.id THEN je.amount ELSE 0 END), 0) as amount
      FROM accounts a
      LEFT JOIN journal_entries je ON (je.debit_account_id = a.id OR je.credit_account_id = a.id) ${dateFilter}
      WHERE a.account_type = 'equity'
      GROUP BY a.id, a.account_code, a.account_name
      HAVING amount != 0
      ORDER BY a.account_code
    `).all(...params);
    
    const assetsTotal = assetDetails.reduce((sum, item) => sum + item.amount, 0);
    const liabilitiesTotal = liabilityDetails.reduce((sum, item) => sum + item.amount, 0);
    const equityTotal = equityDetails.reduce((sum, item) => sum + item.amount, 0);
    
    const html = generateBalanceSheetHTML(assetDetails, liabilityDetails, equityDetails, assetsTotal, liabilitiesTotal, equityTotal, as_of_date);
    res.send(html);
  } catch (error) {
    console.error('Error generating balance-sheet PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// 認証が必要なエンドポイント
router.use(authenticateToken);

// 勘定科目一覧取得
router.get('/accounts', (req, res) => {
  try {
    const accounts = db.prepare('SELECT * FROM accounts WHERE is_active = 1 ORDER BY account_code').all();
    res.json(accounts);
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// 仕訳帳取得（自動生成・手動入力両方を含む）
router.get('/journal', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT 
        je.*,
        da.account_name as debit_account_name, 
        da.account_code as debit_account_code,
        ca.account_name as credit_account_name, 
        ca.account_code as credit_account_code,
        CASE 
          WHEN je.reference_type IS NOT NULL THEN '自動'
          ELSE '手動'
        END as entry_source
      FROM journal_entries je
      LEFT JOIN accounts da ON je.debit_account_id = da.id 
      LEFT JOIN accounts ca ON je.credit_account_id = ca.id 
      WHERE 1=1
    `;
    const params = [];
    
    if (start_date) { 
      query += ' AND je.entry_date >= ?'; 
      params.push(start_date); 
    }
    if (end_date) { 
      query += ' AND je.entry_date <= ?'; 
      params.push(end_date); 
    }
    
    query += ' ORDER BY je.entry_date DESC, je.id DESC';
    const entries = db.prepare(query).all(...params);
    res.json(entries);
  } catch (error) {
    console.error('Error getting journal entries:', error);
    res.status(500).json({ error: 'Failed to get journal entries' });
  }
});

// 手動仕訳登録
router.post('/journal', (req, res) => {
  try {
    const { entry_date, description, debit_account_id, credit_account_id, amount, notes } = req.body;
    
    if (!debit_account_id || !credit_account_id || !amount || amount <= 0) {
      return res.status(400).json({ error: '必須項目を入力してください' });
    }
    
    const result = db.prepare(`
      INSERT INTO journal_entries (
        entry_date, description, debit_account_id, credit_account_id, 
        amount, notes, admin_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry_date, 
      description, 
      debit_account_id, 
      credit_account_id, 
      amount, 
      notes, 
      req.user.id
    );
    
    res.status(201).json({ 
      id: result.lastInsertRowid,
      message: '仕訳を登録しました'
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

// 仕訳削除
router.delete('/journal/:id', (req, res) => {
  try {
    // 自動生成された仕訳は削除不可
    const entry = db.prepare('SELECT reference_type FROM journal_entries WHERE id = ?').get(req.params.id);
    
    if (entry && entry.reference_type) {
      return res.status(403).json({ 
        error: '自動生成された仕訳は削除できません。元のデータ（請求書、発注書など）を削除してください。' 
      });
    }
    
    db.prepare('DELETE FROM journal_entries WHERE id = ?').run(req.params.id);
    res.json({ message: '仕訳を削除しました' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ error: '仕訳の削除に失敗しました' });
  }
});

// 損益計算書
router.get('/profit-loss', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params = [];
    
    let dateFilter = '';
    if (start_date) { 
      dateFilter += ' AND je.entry_date >= ?';
      params.push(start_date);
    }
    if (end_date) { 
      dateFilter += ' AND je.entry_date <= ?';
      params.push(end_date);
    }
    
    // 収益（貸方に計上される）
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(je.amount), 0) as total 
      FROM journal_entries je 
      JOIN accounts a ON je.credit_account_id = a.id 
      WHERE a.account_type = 'revenue' ${dateFilter}
    `).get(...params);
    
    // 費用（借方に計上される）
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(je.amount), 0) as total 
      FROM journal_entries je 
      JOIN accounts a ON je.debit_account_id = a.id 
      WHERE a.account_type = 'expense' ${dateFilter}
    `).get(...params);
    
    const revenueTotal = revenue?.total || 0;
    const expensesTotal = expenses?.total || 0;
    
    res.json({ 
      revenue: revenueTotal, 
      expenses: expensesTotal, 
      net_income: revenueTotal - expensesTotal 
    });
  } catch (error) {
    console.error('Error getting profit and loss:', error);
    res.status(500).json({ error: 'Failed to get profit and loss' });
  }
});

// 貸借対照表
router.get('/balance-sheet', (req, res) => {
  try {
    const { as_of_date } = req.query;
    const dateFilter = as_of_date ? ' AND je.entry_date <= ?' : '';
    const params = as_of_date ? [as_of_date] : [];
    
    // 資産（借方残高）
    const assets = db.prepare(`
      SELECT COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.debit_account_id = a.id
      WHERE a.account_type = 'asset' ${dateFilter}
    `).get(...params);
    
    const assetCredits = db.prepare(`
      SELECT COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.credit_account_id = a.id
      WHERE a.account_type = 'asset' ${dateFilter}
    `).get(...params);
    
    // 負債（貸方残高）
    const liabilities = db.prepare(`
      SELECT COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.credit_account_id = a.id
      WHERE a.account_type = 'liability' ${dateFilter}
    `).get(...params);
    
    const liabilityDebits = db.prepare(`
      SELECT COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.debit_account_id = a.id
      WHERE a.account_type = 'liability' ${dateFilter}
    `).get(...params);
    
    // 純資産（貸方残高）
    const equity = db.prepare(`
      SELECT COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.credit_account_id = a.id
      WHERE a.account_type = 'equity' ${dateFilter}
    `).get(...params);
    
    const equityDebits = db.prepare(`
      SELECT COALESCE(SUM(je.amount), 0) as total
      FROM journal_entries je
      JOIN accounts a ON je.debit_account_id = a.id
      WHERE a.account_type = 'equity' ${dateFilter}
    `).get(...params);
    
    const assetsTotal = (assets?.total || 0) - (assetCredits?.total || 0);
    const liabilitiesTotal = (liabilities?.total || 0) - (liabilityDebits?.total || 0);
    const equityTotal = (equity?.total || 0) - (equityDebits?.total || 0);
    
    res.json({ 
      assets: assetsTotal, 
      liabilities: liabilitiesTotal, 
      equity: equityTotal 
    });
  } catch (error) {
    console.error('Error getting balance sheet:', error);
    res.status(500).json({ error: 'Failed to get balance sheet' });
  }
});

// 試算表
router.get('/trial-balance', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params = [];
    
    let dateFilter = '';
    if (start_date) { 
      dateFilter += ' AND je.entry_date >= ?';
      params.push(start_date);
    }
    if (end_date) { 
      dateFilter += ' AND je.entry_date <= ?';
      params.push(end_date);
    }
    
    const accounts = db.prepare(`
      SELECT 
        a.id,
        a.account_code,
        a.account_name,
        a.account_type as category,
        COALESCE(SUM(CASE WHEN je.debit_account_id = a.id THEN je.amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN je.credit_account_id = a.id THEN je.amount ELSE 0 END), 0) as total_credit
      FROM accounts a
      LEFT JOIN journal_entries je ON (je.debit_account_id = a.id OR je.credit_account_id = a.id) ${dateFilter.replace('je.entry_date', 'je.entry_date')}
      WHERE a.is_active = 1
      GROUP BY a.id, a.account_code, a.account_name, a.account_type
      HAVING total_debit > 0 OR total_credit > 0
      ORDER BY a.account_code
    `).all(...params);
    
    res.json(accounts);
  } catch (error) {
    console.error('Error getting trial balance:', error);
    res.status(500).json({ error: 'Failed to get trial balance' });
  }
});

// ============================================
// 自動仕訳生成ヘルパー関数
// ============================================

// 書類（請求書・見積書）から仕訳を自動生成
export function createJournalFromDocument(documentId, documentType) {
  try {
    const doc = db.prepare(`
      SELECT d.*, c.name as customer_name
      FROM documents d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.id = ?
    `).get(documentId);
    
    if (!doc) return;
    
    // 請求書のみ仕訳を作成（見積書は作成しない）
    if (documentType === 'invoice' && doc.status === 'issued') {
      // 既存の仕訳を削除
      db.prepare(`
        DELETE FROM journal_entries 
        WHERE reference_type = 'document' AND reference_id = ?
      `).run(documentId);
      
      // 売掛金科目と売上科目を取得
      const receivableAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '1100'").get();
      const revenueAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '4000'").get();
      
      if (receivableAccount && revenueAccount) {
        // 借方：売掛金 / 貸方：売上高
        db.prepare(`
          INSERT INTO journal_entries (
            entry_date, description, debit_account_id, credit_account_id, 
            amount, reference_type, reference_id, admin_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          doc.issue_date,
          `${doc.customer_name} 売上計上 (${doc.document_number})`,
          receivableAccount.id,
          revenueAccount.id,
          doc.total_amount,
          'document',
          documentId,
          doc.created_by || 1
        );
      }
      
      // 入金時の仕訳
      if (doc.payment_date) {
        const cashAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '1000'").get();
        
        if (cashAccount && receivableAccount) {
          // 借方：現金 / 貸方：売掛金
          db.prepare(`
            INSERT INTO journal_entries (
              entry_date, description, debit_account_id, credit_account_id, 
              amount, reference_type, reference_id, admin_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            doc.payment_date,
            `${doc.customer_name} 入金 (${doc.document_number})`,
            cashAccount.id,
            receivableAccount.id,
            doc.total_amount,
            'document_payment',
            documentId,
            doc.created_by || 1
          );
        }
      }
    }
  } catch (error) {
    console.error('Error creating journal from document:', error);
  }
}

// 発注書から仕訳を自動生成
export function createJournalFromPurchaseOrder(orderId) {
  try {
    console.log('[仕訳作成] 発注ID:', orderId);
    
    const order = db.prepare(`
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(orderId);
    
    if (!order) {
      console.log('[仕訳作成] 発注が見つかりません');
      return;
    }
    
    console.log('[仕訳作成] 発注データ:', { order_number: order.order_number, status: order.status, total_amount: order.total_amount });
    
    // 既存の仕訳を削除
    db.prepare(`
      DELETE FROM journal_entries 
      WHERE reference_type = 'purchase_order' AND reference_id = ?
    `).run(orderId);
    
    // 納品完了時のみ仕訳を作成
    if (order.status === 'delivered') {
      const purchaseAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '5000'").get();
      const payableAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '2000'").get();
      
      console.log('[仕訳作成] 勘定科目:', { purchase: purchaseAccount?.id, payable: payableAccount?.id });
      
      if (purchaseAccount && payableAccount) {
        // 日付は actual_delivery_date > expected_delivery_date > order_date の順で取得
        const entryDate = order.actual_delivery_date || order.expected_delivery_date || order.order_date;
        
        console.log('[仕訳作成] 使用する日付:', entryDate);
        
        // 借方：仕入高 / 貸方：買掛金
        const result = db.prepare(`
          INSERT INTO journal_entries (
            entry_date, description, debit_account_id, credit_account_id, 
            amount, reference_type, reference_id, admin_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          entryDate,
          `${order.supplier_name} 仕入計上 (${order.order_number})`,
          purchaseAccount.id,
          payableAccount.id,
          order.total_amount,
          'purchase_order',
          orderId,
          order.created_by || 1
        );
        
        console.log('[仕訳作成] 成功 - ID:', result.lastInsertRowid);
      } else {
        console.log('[仕訳作成] 勘定科目が見つかりません');
      }
    } else {
      console.log('[仕訳作成] ステータスがdeliveredではありません:', order.status);
    }
  } catch (error) {
    console.error('[仕訳作成] エラー:', error);
  }
}

// 在庫移動から仕訳を自動生成
export function createJournalFromInventoryMovement(movementId) {
  try {
    const movement = db.prepare(`
      SELECT im.*, i.item_name, i.category
      FROM inventory_movements im
      LEFT JOIN inventory i ON im.inventory_id = i.id
      WHERE im.id = ?
    `).get(movementId);
    
    if (!movement) return;
    
    // 入庫時のみ仕訳を作成（購買による在庫増加）
    if (movement.movement_type === 'in' && movement.reference_type === 'purchase') {
      const inventoryAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '1000'").get();
      const purchaseAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '5000'").get();
      
      if (inventoryAccount && purchaseAccount) {
        const amount = movement.quantity * (movement.unit_cost || 0);
        
        // 借方：在庫資産 / 貸方：仕入高（または現金）
        db.prepare(`
          INSERT INTO journal_entries (
            entry_date, description, debit_account_id, credit_account_id, 
            amount, reference_type, reference_id, admin_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          movement.performed_at.split(' ')[0],
          `${movement.item_name} 在庫計上`,
          inventoryAccount.id,
          purchaseAccount.id,
          amount,
          'inventory_movement',
          movementId,
          movement.performed_by || 1
        );
      }
    }
  } catch (error) {
    console.error('Error creating journal from inventory movement:', error);
  }
}

// 認証が必要なエンドポイント（PDF生成以外）
router.use(authenticateToken);

// 損益計算書HTML生成関数
function generateProfitLossHTML(revenueDetails, expenseDetails, revenueTotal, expensesTotal, netIncome, startDate, endDate) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>損益計算書</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'MS PGothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; 
      background: white;
      padding: 15mm;
      font-size: 11pt;
    }
    .page { 
      max-width: 180mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
    }
    .company-name {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .company-info {
      font-size: 9pt;
      color: #333;
      line-height: 1.5;
    }
    .doc-title {
      font-size: 18pt;
      font-weight: bold;
      margin: 15px 0 10px 0;
      text-align: center;
    }
    .period {
      font-size: 10pt;
      text-align: center;
      margin-bottom: 20px;
      color: #333;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #ccc;
    }
    
    th {
      background: #f5f5f5;
      font-weight: bold;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    
    td.amount {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    tr.section-header td {
      font-weight: bold;
      background: #f9f9f9;
      border-top: 1px solid #999;
      padding-top: 12px;
    }
    
    tr.subtotal td {
      font-weight: bold;
      border-top: 1px solid #666;
      border-bottom: 1px solid #666;
      background: #f5f5f5;
    }
    
    tr.total td {
      font-weight: bold;
      font-size: 12pt;
      border-top: 2px solid #000;
      border-bottom: 3px double #000;
      background: #e8f4f8;
      padding: 12px;
    }
    
    tr.indent td.label {
      padding-left: 30px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #999;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    
    @media print {
      body { padding: 0; }
      .page { max-width: none; }
    }
  </style>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company-name">合同会社N.C.N-WiN</div>
      <div class="company-info">
        〒273-0035 千葉県船橋市本中山2-23-16　TEL: 080-3014-3394
      </div>
    </div>

    <div class="doc-title">損益計算書</div>
    <div class="period">
      自 ${startDate || '期首'} 　至 ${endDate || '期末'}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 60%;">科目</th>
          <th style="width: 40%; text-align: right;">金額</th>
        </tr>
      </thead>
      <tbody>
        <!-- 売上高 -->
        <tr class="section-header">
          <td colspan="2">【売上高】</td>
        </tr>
        ${revenueDetails.map(item => `
        <tr class="indent">
          <td class="label">${item.account_name}</td>
          <td class="amount">¥${item.amount.toLocaleString()}</td>
        </tr>
        `).join('')}
        ${revenueDetails.length === 0 ? '<tr class="indent"><td class="label">売上データなし</td><td class="amount">¥0</td></tr>' : ''}
        <tr class="subtotal">
          <td class="label">売上高合計</td>
          <td class="amount">¥${revenueTotal.toLocaleString()}</td>
        </tr>
        
        <!-- 経費 -->
        <tr class="section-header">
          <td colspan="2">【経費】</td>
        </tr>
        ${expenseDetails.map(item => `
        <tr class="indent">
          <td class="label">${item.account_name}</td>
          <td class="amount">¥${item.amount.toLocaleString()}</td>
        </tr>
        `).join('')}
        ${expenseDetails.length === 0 ? '<tr class="indent"><td class="label">経費データなし</td><td class="amount">¥0</td></tr>' : ''}
        <tr class="subtotal">
          <td class="label">経費合計</td>
          <td class="amount">¥${expensesTotal.toLocaleString()}</td>
        </tr>
        
        <!-- 当期純利益 -->
        <tr class="total">
          <td class="label">${netIncome >= 0 ? '当期純利益' : '当期純損失'}</td>
          <td class="amount">${netIncome >= 0 ? '' : '△'}¥${Math.abs(netIncome).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>発行日: ${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div style="margin-top: 5px;">合同会社N.C.N-WiN 受発注管理システム</div>
    </div>
  </div>
</body>
</html>`;
}

// 貸借対照表HTML生成関数
function generateBalanceSheetHTML(assetDetails, liabilityDetails, equityDetails, assetsTotal, liabilitiesTotal, equityTotal, asOfDate) {
  const totalLiabilitiesEquity = liabilitiesTotal + equityTotal;
  
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>貸借対照表</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'MS PGothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; 
      background: white;
      padding: 15mm;
      font-size: 11pt;
    }
    .page { 
      max-width: 180mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
    }
    .company-name {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .company-info {
      font-size: 9pt;
      color: #333;
      line-height: 1.5;
    }
    .doc-title {
      font-size: 18pt;
      font-weight: bold;
      margin: 15px 0 10px 0;
      text-align: center;
    }
    .as-of-date {
      font-size: 10pt;
      text-align: center;
      margin-bottom: 20px;
      color: #333;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
    }
    
    th, td {
      padding: 8px 12px;
      text-align: left;
      border: 1px solid #999;
    }
    
    th {
      background: #f5f5f5;
      font-weight: bold;
      border: 2px solid #000;
      text-align: center;
    }
    
    td.amount {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    tr.section-header td {
      font-weight: bold;
      background: #f9f9f9;
      border-top: 2px solid #666;
      border-bottom: 1px solid #666;
    }
    
    tr.subtotal td {
      font-weight: bold;
      background: #f5f5f5;
      border-top: 1px solid #666;
    }
    
    tr.total td {
      font-weight: bold;
      font-size: 12pt;
      border: 2px solid #000;
      background: #e8f4f8;
      padding: 12px;
    }
    
    tr.indent td.label {
      padding-left: 30px;
    }
    
    .balance-check {
      text-align: center;
      margin: 20px 0;
      padding: 10px;
      background: ${Math.abs(assetsTotal - totalLiabilitiesEquity) < 0.01 ? '#f6ffed' : '#fff1f0'};
      border: 1px solid ${Math.abs(assetsTotal - totalLiabilitiesEquity) < 0.01 ? '#b7eb8f' : '#ffa39e'};
      border-radius: 4px;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #999;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    
    @media print {
      body { padding: 0; }
      .page { max-width: none; }
    }
  </style>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company-name">合同会社N.C.N-WiN</div>
      <div class="company-info">
        〒273-0035 千葉県船橋市本中山2-23-16　TEL: 080-3014-3394
      </div>
    </div>

    <div class="doc-title">貸借対照表</div>
    <div class="as-of-date">
      ${asOfDate || new Date().toISOString().split('T')[0]} 現在
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 60%;">資産の部</th>
          <th style="width: 40%;">金額</th>
        </tr>
      </thead>
      <tbody>
        ${assetDetails.map(item => `
        <tr class="indent">
          <td class="label">${item.account_name}</td>
          <td class="amount">¥${item.amount.toLocaleString()}</td>
        </tr>
        `).join('')}
        ${assetDetails.length === 0 ? '<tr class="indent"><td class="label">資産データなし</td><td class="amount">¥0</td></tr>' : ''}
        <tr class="total">
          <td class="label">資産合計</td>
          <td class="amount">¥${assetsTotal.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th style="width: 60%;">負債の部</th>
          <th style="width: 40%;">金額</th>
        </tr>
      </thead>
      <tbody>
        ${liabilityDetails.map(item => `
        <tr class="indent">
          <td class="label">${item.account_name}</td>
          <td class="amount">¥${item.amount.toLocaleString()}</td>
        </tr>
        `).join('')}
        ${liabilityDetails.length === 0 ? '<tr class="indent"><td class="label">負債データなし</td><td class="amount">¥0</td></tr>' : ''}
        <tr class="subtotal">
          <td class="label">負債合計</td>
          <td class="amount">¥${liabilitiesTotal.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th style="width: 60%;">純資産の部</th>
          <th style="width: 40%;">金額</th>
        </tr>
      </thead>
      <tbody>
        ${equityDetails.map(item => `
        <tr class="indent">
          <td class="label">${item.account_name}</td>
          <td class="amount">¥${item.amount.toLocaleString()}</td>
        </tr>
        `).join('')}
        ${equityDetails.length === 0 ? '<tr class="indent"><td class="label">純資産データなし</td><td class="amount">¥0</td></tr>' : ''}
        <tr class="subtotal">
          <td class="label">純資産合計</td>
          <td class="amount">¥${equityTotal.toLocaleString()}</td>
        </tr>
        <tr class="total">
          <td class="label">負債・純資産合計</td>
          <td class="amount">¥${totalLiabilitiesEquity.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="balance-check">
      ${Math.abs(assetsTotal - totalLiabilitiesEquity) < 0.01 ? '✓ 貸借バランス一致' : '⚠ 貸借バランス不一致'}
      (差額: ¥${Math.abs(assetsTotal - totalLiabilitiesEquity).toLocaleString()})
    </div>

    <div class="footer">
      <div>発行日: ${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div style="margin-top: 5px;">合同会社N.C.N-WiN 受発注管理システム</div>
    </div>
  </div>
</body>
</html>`;
}

export default router;
