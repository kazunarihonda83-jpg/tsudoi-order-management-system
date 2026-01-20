import Database from 'better-sqlite3';
import { tmpdir } from 'os';
import { join } from 'path';
import bcrypt from 'bcryptjs';
import { existsSync } from 'fs';

export function initDatabase() {
  // Vercel環境では/tmpディレクトリを使用（ただし永続性なし）
  const dbPath = process.env.VERCEL 
    ? join(tmpdir(), 'order_management.db')
    : join(process.cwd(), 'order_management.db');
  
  console.log('Initializing database at:', dbPath);
  
  // Vercel環境でデータベースファイルが存在するかチェック
  const dbExists = existsSync(dbPath);
  const isVercel = !!process.env.VERCEL;
  
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // Create administrators table
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
  `);

  // Check if admin user exists
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM administrators WHERE username = ?').get('13湯麺集TSUDOI');
  
  if (adminExists.count === 0) {
    console.log('Creating default admin user...');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO administrators (username, password, email, permissions) VALUES (?, ?, ?, ?)').run(
      '13湯麺集TSUDOI',
      hashedPassword,
      'info@tsudoi-ramen.com',
      'all'
    );
    console.log('Default admin user created successfully');
  }

  // Create other tables
  db.exec(`
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
      is_primary INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_number TEXT UNIQUE NOT NULL,
      document_type TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE,
      payment_date DATE,
      status TEXT DEFAULT 'draft',
      tax_type TEXT DEFAULT 'exclusive',
      tax_rate REAL DEFAULT 10.0,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (created_by) REFERENCES administrators (id)
    );

    CREATE TABLE IF NOT EXISTS document_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 10.0,
      amount REAL NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_type TEXT NOT NULL,
      name TEXT NOT NULL,
      postal_code TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      payment_terms INTEGER DEFAULT 30,
      bank_name TEXT,
      branch_name TEXT,
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
      is_primary INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      order_date DATE NOT NULL,
      expected_delivery_date DATE,
      actual_delivery_date DATE,
      status TEXT DEFAULT 'ordered',
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
      FOREIGN KEY (created_by) REFERENCES administrators (id)
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 10.0,
      amount REAL NOT NULL,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_code TEXT UNIQUE NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      parent_account_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_account_id) REFERENCES accounts (id)
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date DATE NOT NULL,
      description TEXT,
      debit_account_id INTEGER NOT NULL,
      credit_account_id INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      admin_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debit_account_id) REFERENCES accounts (id),
      FOREIGN KEY (credit_account_id) REFERENCES accounts (id),
      FOREIGN KEY (admin_id) REFERENCES administrators (id)
    );

    CREATE TABLE IF NOT EXISTS operation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_type TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id INTEGER,
      operation_detail TEXT,
      operated_by INTEGER,
      operated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operated_by) REFERENCES administrators (id)
    );

    -- 在庫管理テーブル
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      category TEXT,
      supplier_id INTEGER,
      unit TEXT DEFAULT '個',
      current_stock REAL DEFAULT 0,
      reorder_point REAL DEFAULT 0,
      optimal_stock REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      expiry_date DATE,
      storage_location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    );

    -- 在庫移動履歴テーブル
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      performed_by INTEGER,
      performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE,
      FOREIGN KEY (performed_by) REFERENCES administrators (id)
    );

    -- 在庫アラートテーブル
    CREATE TABLE IF NOT EXISTS stock_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL,
      alert_level TEXT DEFAULT 'warning',
      message TEXT NOT NULL,
      is_resolved INTEGER DEFAULT 0,
      resolved_at DATETIME,
      resolved_by INTEGER,
      manually_dismissed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by) REFERENCES administrators (id)
    );

    -- 経費テーブル（領収書OCR用）
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      vendor TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      description TEXT,
      receipt_image TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES administrators (id)
    );
  `);

  // Create default accounts if they don't exist
  const accountsCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get();
  if (accountsCount.count === 0) {
    console.log('Creating default accounts...');
    const defaultAccounts = [
      ['1000', '現金', 'asset'],
      ['1100', '売掛金', 'asset'],
      ['2000', '買掛金', 'liability'],
      ['3000', '資本金', 'equity'],
      ['4000', '売上高', 'revenue'],
      ['5000', '仕入高', 'expense'],
      ['6000', '給料', 'expense'],
      ['7000', '地代家賃', 'expense']
    ];

    const stmt = db.prepare('INSERT INTO accounts (account_code, account_name, account_type) VALUES (?, ?, ?)');
    for (const [code, name, type] of defaultAccounts) {
      stmt.run(code, name, type);
    }
    console.log('Default accounts created successfully');
  }

  // Create default suppliers if they don't exist
  const suppliersCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
  if (suppliersCount.count === 0) {
    console.log('Creating default suppliers...');
    const defaultSuppliers = [
      {
        supplier_type: '麺類',
        name: '千葉食材センター',
        postal_code: '273-0105',
        address: '千葉県鎌ケ谷市鎌ケ谷1-8-2',
        phone: '047-444-1234',
        email: 'info@chiba-foods.co.jp',
        payment_terms: 30,
        bank_name: '千葉銀行',
        branch_name: '鎌ケ谷支店',
        account_type: '普通',
        account_number: '1234567',
        account_holder: 'カ）チバショクザイセンター',
        notes: '中華麺・自家製麺専門'
      },
      {
        supplier_type: '青果',
        name: '関東青果市場',
        postal_code: '273-0002',
        address: '千葉県船橋市東船橋5-7-1',
        phone: '047-422-5678',
        email: 'sales@kanto-seika.co.jp',
        payment_terms: 30,
        bank_name: '京葉銀行',
        branch_name: '船橋支店',
        account_type: '普通',
        account_number: '8765432',
        account_holder: 'カ）カントウセイカイチバ',
        notes: 'ネギ・もやし・メンマ・白菜専門'
      },
      {
        supplier_type: '食肉',
        name: '東京食肉卸',
        postal_code: '125-0062',
        address: '東京都葛飾区青戸7-2-1',
        phone: '03-3602-7890',
        email: '',
        payment_terms: 30,
        bank_name: '三菱UFJ銀行',
        branch_name: '青戸支店',
        account_type: '普通',
        account_number: '5551234',
        account_holder: 'カ）トウキョウショクニクオロシ',
        notes: '豚バラ・チャーシュー用豚肉・鶏ガラ'
      },
      {
        supplier_type: '調味料',
        name: '調味料専門店',
        postal_code: '273-0113',
        address: '千葉県鎌ケ谷市道野辺中央2-1-30',
        phone: '047-445-3456',
        email: '',
        payment_terms: 30,
        bank_name: '千葉興業銀行',
        branch_name: '鎌ケ谷支店',
        account_type: '普通',
        account_number: '3334567',
        account_holder: 'カ）チョウミリョウセンモンテン',
        notes: '醤油・味噌・塩・香辛料・ラー油'
      }
    ];

    const supplierStmt = db.prepare(`
      INSERT INTO suppliers (
        supplier_type, name, postal_code, address, phone, email, payment_terms,
        bank_name, branch_name, account_type, account_number, account_holder, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const supplier of defaultSuppliers) {
      supplierStmt.run(
        supplier.supplier_type,
        supplier.name,
        supplier.postal_code,
        supplier.address,
        supplier.phone,
        supplier.email,
        supplier.payment_terms,
        supplier.bank_name,
        supplier.branch_name,
        supplier.account_type,
        supplier.account_number,
        supplier.account_holder,
        supplier.notes
      );
    }
    console.log('Default suppliers created successfully');
  }

  // Create default purchase orders if they don't exist
  const purchaseOrdersCount = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get();
  if (purchaseOrdersCount.count === 0) {
    console.log('Creating default purchase orders...');
    
    // Get supplier IDs
    const shokuzai = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('千葉食材センター');
    const seika = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('関東青果市場');
    const niku = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('東京食肉卸');
    const chomiryo = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('調味料専門店');
    
    // Get admin user ID
    const admin = db.prepare('SELECT id FROM administrators WHERE username = ?').get('13湯麺集TSUDOI');
    
    if (shokuzai && seika && niku && chomiryo && admin) {
      const defaultOrders = [
        {
          order_number: 'PO-2026-001',
          supplier_id: shokuzai.id,
          order_date: '2026-01-15',
          expected_delivery_date: '2026-01-16',
          status: 'delivered',
          created_by: admin.id,
          items: [
            { item_name: '中華麺（細麺）', description: '1kg×20袋', quantity: 20, unit_price: 280, tax_rate: 10.0 },
            { item_name: '中華麺（太麺）', description: '1kg×10袋', quantity: 10, unit_price: 300, tax_rate: 10.0 },
            { item_name: 'ワンタンの皮', description: '500g×5', quantity: 5, unit_price: 180, tax_rate: 10.0 }
          ]
        },
        {
          order_number: 'PO-2026-002',
          supplier_id: seika.id,
          order_date: '2026-01-16',
          expected_delivery_date: '2026-01-17',
          status: 'delivered',
          created_by: admin.id,
          items: [
            { item_name: 'ネギ', description: '1kg×10束', quantity: 10, unit_price: 200, tax_rate: 10.0 },
            { item_name: 'もやし', description: '1kg×20袋', quantity: 20, unit_price: 50, tax_rate: 10.0 },
            { item_name: 'キャベツ', description: '1玉×10', quantity: 10, unit_price: 150, tax_rate: 10.0 },
            { item_name: 'にんにく', description: '500g×3', quantity: 3, unit_price: 400, tax_rate: 10.0 }
          ]
        },
        {
          order_number: 'PO-2026-003',
          supplier_id: niku.id,
          order_date: '2026-01-17',
          expected_delivery_date: '2026-01-18',
          status: 'delivered',
          created_by: admin.id,
          items: [
            { item_name: '豚バラ肉（チャーシュー用）', description: '2kg×5', quantity: 5, unit_price: 1800, tax_rate: 10.0 },
            { item_name: '鶏ガラ', description: '5kg', quantity: 2, unit_price: 800, tax_rate: 10.0 },
            { item_name: '豚骨', description: '10kg', quantity: 1, unit_price: 1200, tax_rate: 10.0 }
          ]
        }
      ];

      for (const order of defaultOrders) {
        // Calculate totals
        let subtotal = 0;
        for (const item of order.items) {
          subtotal += item.quantity * item.unit_price;
        }
        const tax_amount = Math.round(subtotal * 0.1);
        const total_amount = subtotal + tax_amount;

        // Insert purchase order
        const result = db.prepare(`
          INSERT INTO purchase_orders (
            order_number, supplier_id, order_date, expected_delivery_date, 
            status, subtotal, tax_amount, total_amount, created_by
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          order.order_number,
          order.supplier_id,
          order.order_date,
          order.expected_delivery_date,
          order.status,
          subtotal,
          tax_amount,
          total_amount,
          order.created_by
        );

        // Insert order items
        const itemStmt = db.prepare(`
          INSERT INTO purchase_order_items (
            purchase_order_id, item_name, description, quantity, unit_price, tax_rate, amount
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of order.items) {
          const amount = item.quantity * item.unit_price;
          itemStmt.run(
            result.lastInsertRowid,
            item.item_name,
            item.description,
            item.quantity,
            item.unit_price,
            item.tax_rate,
            amount
          );
        }
        
        // 納品完了の発注に対して仕訳を自動作成
        if (order.status === 'delivered') {
          const purchaseAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '5000'").get();
          const payableAccount = db.prepare("SELECT id FROM accounts WHERE account_code = '2000'").get();
          const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(order.supplier_id);
          
          if (purchaseAccount && payableAccount && supplier) {
            db.prepare(`
              INSERT INTO journal_entries (
                entry_date, description, debit_account_id, credit_account_id, 
                amount, reference_type, reference_id, admin_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              order.order_date,
              `${supplier.name} 仕入計上 (${order.order_number})`,
              purchaseAccount.id,
              payableAccount.id,
              total_amount,
              'purchase_order',
              result.lastInsertRowid,
              order.created_by
            );
          }
        }
      }
      
      console.log('Default purchase orders created successfully');
    }
  }

  // セットアップ状態を管理するテーブルを作成（存在しない場合）
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_setup (
      key TEXT PRIMARY KEY,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 在庫データは一切挿入しない（ユーザーが手動で追加する）
  console.log('Inventory table ready (no default data)');
  
  // 在庫初期化フラグを設定（デフォルトデータは挿入しない）
  const inventorySetup = db.prepare('SELECT value FROM system_setup WHERE key = ?').get('inventory_initialized');
  if (!inventorySetup) {
    db.prepare('INSERT OR REPLACE INTO system_setup (key, value) VALUES (?, ?)').run(
      'inventory_initialized',
      'true'
    );
    console.log('Inventory initialization marked (empty state)');
  }

  return db;
}
