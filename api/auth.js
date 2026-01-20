import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync, mkdirSync, copyFileSync } from 'fs';

// Vercel環境でのデータベース初期化
function initDatabase() {
  const dbPath = process.env.VERCEL ? join(tmpdir(), 'order_management.db') : join(process.cwd(), 'order_management.db');
  
  // データベースが存在しない場合は作成
  if (!existsSync(dbPath)) {
    const db = new Database(dbPath);
    
    // テーブル作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS administrators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'admin',
        permissions TEXT DEFAULT 'all',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // デフォルト管理者を作成
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const stmt = db.prepare('INSERT OR IGNORE INTO administrators (username, password, email, permissions) VALUES (?, ?, ?, ?)');
    stmt.run('13湯麺集TSUDOI', hashedPassword, 'info@tsudoi-ramen.com', 'all');
    
    db.close();
  }
  
  return new Database(dbPath);
}

// トークン生成
function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      role: user.role 
    },
    secret,
    { expiresIn: '24h' }
  );
}

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = initDatabase();

  try {
    // /api/auth/login
    if (req.url === '/api/auth/login' || req.url === '/login') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = db.prepare('SELECT * FROM administrators WHERE username = ? AND is_active = 1').get(username);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = bcrypt.compareSync(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user);

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        }
      });
    }

    // /api/auth/me
    if (req.url === '/api/auth/me' || req.url === '/me') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

      try {
        const decoded = jwt.verify(token, secret);
        const user = db.prepare('SELECT id, username, email, role, permissions FROM administrators WHERE id = ?').get(decoded.id);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        return res.json(user);
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  } finally {
    db.close();
  }
}
