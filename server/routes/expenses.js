import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 認証ミドルウェアを適用
router.use(authenticateToken);

// 経費一覧取得
router.get('/', (req, res) => {
  try {
    const expenses = db.prepare(`
      SELECT * FROM expenses 
      ORDER BY date DESC, created_at DESC
    `).all();
    
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 経費詳細取得
router.get('/:id', (req, res) => {
  try {
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ error: '経費が見つかりません' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 経費作成
router.post('/', (req, res) => {
  try {
    const { date, vendor, amount, category, description, receipt_image } = req.body;
    
    const result = db.prepare(`
      INSERT INTO expenses (date, vendor, amount, category, description, receipt_image, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(date, vendor, amount, category, description, receipt_image, req.user.id);
    
    res.json({ id: result.lastInsertRowid, message: '経費を登録しました' });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 経費更新
router.put('/:id', (req, res) => {
  try {
    const { date, vendor, amount, category, description, receipt_image } = req.body;
    
    const result = db.prepare(`
      UPDATE expenses 
      SET date = ?, vendor = ?, amount = ?, category = ?, description = ?, receipt_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(date, vendor, amount, category, description, receipt_image, req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '経費が見つかりません' });
    }
    
    res.json({ message: '経費を更新しました' });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 経費削除
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '経費が見つかりません' });
    }
    
    res.json({ message: '経費を削除しました' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
