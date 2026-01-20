import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
router.use(authenticateToken);

router.get('/accounts', (req, res) => {
  try {
    const accounts = db.prepare('SELECT * FROM accounts WHERE is_active = 1 ORDER BY account_code').all();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

router.get('/journal', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT je.*, da.account_name as debit_account_name, da.account_code as debit_account_code,
      ca.account_name as credit_account_name, ca.account_code as credit_account_code FROM journal_entries je
      LEFT JOIN accounts da ON je.debit_account_id = da.id LEFT JOIN accounts ca ON je.credit_account_id = ca.id WHERE 1=1`;
    const params = [];
    if (start_date) { query += ' AND je.entry_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND je.entry_date <= ?'; params.push(end_date); }
    query += ' ORDER BY je.entry_date DESC, je.id DESC';
    const entries = db.prepare(query).all(...params);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get journal entries' });
  }
});

router.post('/journal', (req, res) => {
  try {
    const { entry_date, description, debit_account_id, credit_account_id, amount, notes } = req.body;
    const result = db.prepare(`INSERT INTO journal_entries (entry_date, description, debit_account_id, credit_account_id, 
      amount, notes, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(entry_date, description, debit_account_id, credit_account_id, amount, notes, req.user.id);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

router.delete('/journal/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM journal_entries WHERE id = ?').run(req.params.id);
    res.json({ message: '仕訳を削除しました' });
  } catch (error) {
    res.status(500).json({ error: '仕訳の削除に失敗しました' });
  }
});

router.get('/profit-loss', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params = [start_date, end_date].filter(Boolean);
    const revenue = db.prepare(`SELECT SUM(je.amount) as total FROM journal_entries je JOIN accounts a ON je.credit_account_id = a.id 
      WHERE a.account_type = 'revenue' ${start_date ? 'AND je.entry_date >= ?' : ''} ${end_date ? 'AND je.entry_date <= ?' : ''}`).get(...params);
    const expense = db.prepare(`SELECT SUM(je.amount) as total FROM journal_entries je JOIN accounts a ON je.debit_account_id = a.id 
      WHERE a.account_type = 'expense' ${start_date ? 'AND je.entry_date >= ?' : ''} ${end_date ? 'AND je.entry_date <= ?' : ''}`).get(...params);
    const revenueTotal = revenue?.total || 0;
    const expenseTotal = expense?.total || 0;
    res.json({ revenue: revenueTotal, expense: expenseTotal, net_income: revenueTotal - expenseTotal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profit and loss' });
  }
});

export default router;
