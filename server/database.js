import { initDatabase } from './database-init.js';

// グローバルなデータベースインスタンスをキャッシュ
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

const db = getDatabase();

export default db;
