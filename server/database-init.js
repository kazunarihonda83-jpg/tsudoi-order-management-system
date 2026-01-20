import Database from 'better-sqlite3';
import { tmpdir } from 'os';
import { join } from 'path';
import bcrypt from 'bcryptjs';
import { existsSync } from 'fs';

export function initDatabase() {
  // Vercel環境では/tmpディレクトリを使用
  const dbPath = process.env.VERCEL 
    ? join(tmpdir(), 'order_management.db')
    : join(process.cwd(), 'order_management.db');
  
  console.log('Initializing database at:', dbPath);
  
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
    const fish = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('北海道鮮魚卸');
    const sake = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('札幌酒類販売');
    const yasai = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('道産野菜センター');
    const meat = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('北の食肉センター');
    
    // Get admin user ID
    const admin = db.prepare('SELECT id FROM administrators WHERE username = ?').get('食彩厨房やくも');
    
    if (fish && sake && yasai && meat && admin) {
      const defaultOrders = [
        {
          order_number: 'PO-2025-001',
          supplier_id: fish.id,
          order_date: '2025-01-15',
          expected_delivery_date: '2025-01-16',
          status: 'delivered',
          created_by: admin.id,
          items: [
            { item_name: '本マグロ（刺身用）', description: '1kg', quantity: 2, unit_price: 8500, tax_rate: 10.0 },
            { item_name: 'サーモン刺身', description: '500g×4', quantity: 4, unit_price: 2800, tax_rate: 10.0 },
            { item_name: 'ホタテ貝柱', description: '500g', quantity: 3, unit_price: 3200, tax_rate: 10.0 },
            { item_name: 'イカ（刺身用）', description: '1kg', quantity: 2, unit_price: 1800, tax_rate: 10.0 }
          ]
        },
        {
          order_number: 'PO-2025-002',
          supplier_id: sake.id,
          order_date: '2025-01-15',
          expected_delivery_date: '2025-01-17',
          status: 'delivered',
          created_by: admin.id,
          items: [
            { item_name: '獺祭 純米大吟醸', description: '720ml×6本', quantity: 6, unit_price: 3500, tax_rate: 10.0 },
            { item_name: '八海山 純米吟醸', description: '1.8L×3本', quantity: 3, unit_price: 4200, tax_rate: 10.0 },
            { item_name: 'サッポロクラシック', description: '瓶ビール 500ml×24本', quantity: 1, unit_price: 9600, tax_rate: 10.0 },
            { item_name: '芋焼酎 魔王', description: '1.8L×2本', quantity: 2, unit_price: 5800, tax_rate: 10.0 }
          ]
        },
        {
          order_number: 'PO-2025-003',
          supplier_id: yasai.id,
          order_date: '2025-01-16',
          expected_delivery_date: '2025-01-17',
          status: 'ordered',
          created_by: admin.id,
          items: [
            { item_name: '北海道産じゃがいも', description: '10kg', quantity: 2, unit_price: 1800, tax_rate: 10.0 },
            { item_name: '玉ねぎ', description: '10kg', quantity: 2, unit_price: 1200, tax_rate: 10.0 },
            { item_name: 'アスパラガス', description: '1kg', quantity: 3, unit_price: 2500, tax_rate: 10.0 },
            { item_name: '大根', description: '1本×10', quantity: 10, unit_price: 180, tax_rate: 10.0 }
          ]
        },
        {
          order_number: 'PO-2025-004',
          supplier_id: meat.id,
          order_date: '2025-01-17',
          expected_delivery_date: '2025-01-18',
          status: 'ordered',
          created_by: admin.id,
          items: [
            { item_name: 'ラム肉（ジンギスカン用）', description: '1kg×5', quantity: 5, unit_price: 2800, tax_rate: 10.0 },
            { item_name: '豚バラ肉', description: '2kg', quantity: 3, unit_price: 1600, tax_rate: 10.0 },
            { item_name: '鶏もも肉', description: '2kg×2', quantity: 2, unit_price: 1400, tax_rate: 10.0 },
            { item_name: '牛タン（焼肉用）', description: '500g×2', quantity: 2, unit_price: 4500, tax_rate: 10.0 }
          ]
        },
        {
          order_number: 'PO-2025-005',
          supplier_id: fish.id,
          order_date: '2025-01-18',
          expected_delivery_date: '2025-01-19',
          status: 'ordered',
          created_by: admin.id,
          items: [
            { item_name: '活ホッケ', description: '1尾×5', quantity: 5, unit_price: 800, tax_rate: 10.0 },
            { item_name: 'カニ（ズワイガニ）', description: '500g×3', quantity: 3, unit_price: 4200, tax_rate: 10.0 },
            { item_name: 'ウニ', description: '100g×5', quantity: 5, unit_price: 2800, tax_rate: 10.0 }
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

  // 在庫の初期セットアップが完了しているかチェック
  const inventorySetup = db.prepare('SELECT value FROM system_setup WHERE key = ?').get('inventory_initialized');
  
  // 初回セットアップ時のみデフォルト在庫を作成
  if (!inventorySetup) {
    console.log('Creating default inventory (first time setup)...');
    
    const noodles = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('千葉食材センター');
    const vegetables = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('関東青果市場');
    const meat = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('東京食肉卸');
    const seasoning = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('調味料専門店');

    const defaultInventory = [
      // 麺類
      { item_name: '中華麺（細麺）', category: '麺類', supplier_id: noodles?.id, unit: 'kg', current_stock: 20, reorder_point: 10, optimal_stock: 40, unit_cost: 280, expiry_date: '2026-01-25', storage_location: '冷蔵庫A' },
      { item_name: '中華麺（太麺）', category: '麺類', supplier_id: noodles?.id, unit: 'kg', current_stock: 15, reorder_point: 10, optimal_stock: 30, unit_cost: 300, expiry_date: '2026-01-25', storage_location: '冷蔵庫A' },
      { item_name: '自家製麺', category: '麺類', supplier_id: noodles?.id, unit: 'kg', current_stock: 8, reorder_point: 5, optimal_stock: 15, unit_cost: 450, expiry_date: '2026-01-23', storage_location: '冷蔵庫A' },
      
      // 青果
      { item_name: 'ネギ', category: '青果', supplier_id: vegetables?.id, unit: 'kg', current_stock: 5, reorder_point: 3, optimal_stock: 10, unit_cost: 350, expiry_date: '2026-01-27', storage_location: '冷蔵庫B' },
      { item_name: 'もやし', category: '青果', supplier_id: vegetables?.id, unit: 'kg', current_stock: 8, reorder_point: 5, optimal_stock: 15, unit_cost: 150, expiry_date: '2026-01-24', storage_location: '冷蔵庫B' },
      { item_name: 'メンマ', category: '青果', supplier_id: vegetables?.id, unit: 'kg', current_stock: 3, reorder_point: 2, optimal_stock: 8, unit_cost: 800, expiry_date: '2026-02-15', storage_location: '倉庫' },
      { item_name: '白菜', category: '青果', supplier_id: vegetables?.id, unit: 'kg', current_stock: 6, reorder_point: 4, optimal_stock: 12, unit_cost: 200, expiry_date: '2026-01-30', storage_location: '冷蔵庫B' },
      { item_name: 'ニラ', category: '青果', supplier_id: vegetables?.id, unit: 'kg', current_stock: 2, reorder_point: 2, optimal_stock: 6, unit_cost: 400, expiry_date: '2026-01-26', storage_location: '冷蔵庫B' },
      
      // 食肉
      { item_name: '豚バラ肉（チャーシュー用）', category: '食肉', supplier_id: meat?.id, unit: 'kg', current_stock: 12, reorder_point: 8, optimal_stock: 20, unit_cost: 1800, expiry_date: '2026-01-28', storage_location: '冷蔵庫C' },
      { item_name: '豚ロース', category: '食肉', supplier_id: meat?.id, unit: 'kg', current_stock: 8, reorder_point: 5, optimal_stock: 15, unit_cost: 2200, expiry_date: '2026-01-28', storage_location: '冷蔵庫C' },
      { item_name: '鶏ガラ', category: '食肉', supplier_id: meat?.id, unit: 'kg', current_stock: 15, reorder_point: 10, optimal_stock: 25, unit_cost: 500, expiry_date: '2026-01-27', storage_location: '冷凍庫' },
      
      // 調味料
      { item_name: '醤油', category: '調味料', supplier_id: seasoning?.id, unit: 'L', current_stock: 20, reorder_point: 10, optimal_stock: 40, unit_cost: 600, storage_location: '倉庫' },
      { item_name: '味噌', category: '調味料', supplier_id: seasoning?.id, unit: 'kg', current_stock: 15, reorder_point: 8, optimal_stock: 30, unit_cost: 800, storage_location: '倉庫' },
      { item_name: '塩', category: '調味料', supplier_id: seasoning?.id, unit: 'kg', current_stock: 10, reorder_point: 5, optimal_stock: 20, unit_cost: 300, storage_location: '倉庫' },
      { item_name: 'ラー油', category: '調味料', supplier_id: seasoning?.id, unit: 'L', current_stock: 5, reorder_point: 3, optimal_stock: 10, unit_cost: 1200, storage_location: '倉庫' },
      { item_name: '香辛料セット', category: '調味料', supplier_id: seasoning?.id, unit: 'セット', current_stock: 3, reorder_point: 2, optimal_stock: 6, unit_cost: 2500, storage_location: '倉庫' }
    ];

    const invStmt = db.prepare(`
      INSERT INTO inventory (
        item_name, category, supplier_id, unit, current_stock, 
        reorder_point, optimal_stock, unit_cost, expiry_date, storage_location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const admin = db.prepare('SELECT id FROM administrators WHERE username = ?').get('13湯麺集TSUDOI');
    const movementStmt = db.prepare(`
      INSERT INTO inventory_movements (
        inventory_id, movement_type, quantity, unit_cost, reference_type, notes, performed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of defaultInventory) {
      const result = invStmt.run(
        item.item_name,
        item.category,
        item.supplier_id,
        item.unit,
        item.current_stock,
        item.reorder_point,
        item.optimal_stock,
        item.unit_cost,
        item.expiry_date || null,
        item.storage_location
      );

      // 初期在庫の移動履歴を記録
      movementStmt.run(
        result.lastInsertRowid,
        'initial',
        item.current_stock,
        item.unit_cost,
        'initial_setup',
        '初期在庫登録',
        admin.id
      );
    }

    console.log('Default inventory created successfully');

    // 在庫アラートをチェック
    console.log('Checking inventory alerts...');
    const lowStockItems = db.prepare(`
      SELECT id, item_name, current_stock, reorder_point 
      FROM inventory 
      WHERE current_stock <= reorder_point
    `).all();

    const alertStmt = db.prepare(`
      INSERT INTO stock_alerts (inventory_id, alert_type, alert_level, message)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of lowStockItems) {
      alertStmt.run(
        item.id,
        'low_stock',
        'warning',
        `${item.item_name}の在庫が発注点（${item.reorder_point}${item.unit}）以下です。現在在庫：${item.current_stock}${item.unit}`
      );
    }

    const expiringItems = db.prepare(`
      SELECT id, item_name, expiry_date
      FROM inventory
      WHERE expiry_date IS NOT NULL 
      AND date(expiry_date) <= date('now', '+7 days')
    `).all();

    for (const item of expiringItems) {
      alertStmt.run(
        item.id,
        'expiry_warning',
        'urgent',
        `${item.item_name}の賞味期限が近づいています（${item.expiry_date}）`
      );
    }

    console.log('Inventory alerts created successfully');
    
    // 在庫の初期セットアップ完了をマーク
    db.prepare('INSERT OR REPLACE INTO system_setup (key, value) VALUES (?, ?)').run(
      'inventory_initialized',
      'true'
    );
    console.log('Inventory initialization completed and marked');
  }

  return db;
}
