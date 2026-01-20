import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
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

export default router;
