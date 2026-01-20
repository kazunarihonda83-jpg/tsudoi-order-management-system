import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Vercel環境では /tmp を使用
const isVercel = process.env.VERCEL === '1';
const dbDir = isVercel ? '/tmp' : join(__dirname, '..');
const dbPath = join(dbDir, 'order_management.db');

// データベースディレクトリの作成
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// 既存のDBがあればコピー（初回のみ）
if (isVercel) {
  const sourceDb = join(__dirname, '..', 'order_management.db');
  if (existsSync(sourceDb) && !existsSync(dbPath)) {
    try {
      copyFileSync(sourceDb, dbPath);
    } catch (err) {
      console.log('DB copy not needed or failed:', err.message);
    }
  }
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS administrators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    permissions TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_type TEXT NOT NULL,
    name TEXT NOT NULL,
    postal_code TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customer_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    position TEXT,
    email TEXT,
    phone TEXT,
    postal_code TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_number TEXT UNIQUE NOT NULL,
    document_type TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    contact_id INTEGER,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    delivery_date DATE,
    tax_type TEXT DEFAULT 'exclusive',
    tax_rate REAL DEFAULT 10,
    subtotal REAL NOT NULL,
    tax_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    payment_status TEXT DEFAULT 'unpaid',
    payment_date DATE,
    advance_payment REAL DEFAULT 0,
    notes TEXT,
    admin_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (contact_id) REFERENCES customer_contacts(id)
  );

  CREATE TABLE IF NOT EXISTS document_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    tax_category TEXT DEFAULT 'standard',
    subtotal REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_type TEXT DEFAULT 'corporate',
    name TEXT NOT NULL,
    postal_code TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    payment_terms INTEGER DEFAULT 30,
    bank_name TEXT,
    bank_branch TEXT,
    account_type TEXT,
    account_number TEXT,
    account_holder TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS supplier_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    position TEXT,
    email TEXT,
    phone TEXT,
    postal_code TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    delivery_address TEXT,
    tax_type TEXT DEFAULT 'exclusive',
    tax_rate REAL DEFAULT 10,
    subtotal REAL NOT NULL,
    tax_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    admin_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    tax_category TEXT DEFAULT 'standard',
    subtotal REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_code TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    debit_account_id INTEGER NOT NULL,
    credit_account_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    notes TEXT,
    admin_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (debit_account_id) REFERENCES accounts(id),
    FOREIGN KEY (credit_account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS operation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    operation_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER,
    description TEXT,
    before_data TEXT,
    after_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES administrators(id)
  );
`);

// Insert default admin user
const adminCheck = db.prepare('SELECT COUNT(*) as count FROM administrators').get();
if (adminCheck.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO administrators (username, password, email, role) VALUES (?, ?, ?, ?)').run('admin', hashedPassword, 'admin@example.com', 'admin');
}

// Insert default accounts
const accountCheck = db.prepare('SELECT COUNT(*) as count FROM accounts').get();
if (accountCheck.count === 0) {
  const accounts = [
    ['1000', '現金', 'asset'],
    ['1100', '普通預金', 'asset'],
    ['1200', '売掛金', 'asset'],
    ['2000', '買掛金', 'liability'],
    ['2100', '未払金', 'liability'],
    ['3000', '資本金', 'equity'],
    ['4000', '売上高', 'revenue'],
    ['5000', '仕入高', 'expense'],
    ['5100', '給料手当', 'expense'],
    ['5200', '地代家賃', 'expense'],
    ['5300', '通信費', 'expense'],
    ['5400', '水道光熱費', 'expense']
  ];
  
  const stmt = db.prepare('INSERT INTO accounts (account_code, account_name, account_type) VALUES (?, ?, ?)');
  accounts.forEach(acc => stmt.run(...acc));
}

console.log('Database initialized successfully for Vercel');

export default db;
