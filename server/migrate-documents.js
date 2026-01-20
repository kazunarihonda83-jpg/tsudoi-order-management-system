import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../order_management.db');
const db = new Database(dbPath);

console.log('Starting migration...');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(documents)").all();
  const hasТaxType = tableInfo.some(col => col.name === 'tax_type');
  const hasTaxRate = tableInfo.some(col => col.name === 'tax_rate');
  
  if (!hasТaxType) {
    console.log('Adding tax_type column...');
    db.prepare("ALTER TABLE documents ADD COLUMN tax_type TEXT DEFAULT 'exclusive'").run();
    console.log('✓ tax_type column added');
  } else {
    console.log('tax_type column already exists');
  }
  
  if (!hasTaxRate) {
    console.log('Adding tax_rate column...');
    db.prepare("ALTER TABLE documents ADD COLUMN tax_rate REAL DEFAULT 10.0").run();
    console.log('✓ tax_rate column added');
  } else {
    console.log('tax_rate column already exists');
  }
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
