// database/init.ts
import * as SQLite from 'expo-sqlite';

// Открываем файл базы данных (он создастся сам при первом запуске)
export const db = SQLite.openDatabaseSync('petvet.db');

export const initDatabase = async () => {
  try {
    // Включаем поддержку внешних ключей
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Создаем таблицу питомцев
    // local_id - внутренний ID телефона (PRIMARY KEY)
    // server_id - ID с бэкенда (может быть NULL, если еще не синхронизировали)
    // sync_status - статус записи ('created' | 'updated' | 'synced' | 'deleted')
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pets (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER DEFAULT NULL,
        sync_status TEXT DEFAULT 'created',
        
        name TEXT NOT NULL,
        gender TEXT,
        birth_date TEXT,
        breed TEXT, 
        species TEXT,
        chip_number TEXT,
        avatar_path TEXT, -- путь к локальному файлу картинки
        
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('📦 Local Database (SQLite) initialized');
  } catch (error) {
    console.error('❌ Database init failed:', error);
  }
};