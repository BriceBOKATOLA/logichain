// import SQLite from 'react-native-sqlite-storage';
import * as SQLite from 'expo-sqlite';

// SQLite.enablePromise(true);
// Ouverture async moderne de la BDD
export const getDb = async () => {
  return await SQLite.openDatabaseAsync('logichain.db');
};

/**
 * LocalDatabase — Singleton encapsulant la base SQLite embarquée (Offline-First).
 * Aucune autre couche que les *Repository de ce dossier ne doit importer SQLite
 * directement : c'est le pendant mobile de la règle "Repository = seul accès aux données".
 */
class LocalDatabase {
  constructor() {
    if (LocalDatabase.instance) return LocalDatabase.instance;
    this.db = null;
    LocalDatabase.instance = this;
  }

  async open() {
    if (this.db) return this.db;
    this.db = await SQLite.openDatabase({ name: 'logichain.db', location: 'default' });
    await this._migrate();
    return this.db;
  }

  async _migrate() {
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT,
        status TEXT,
        raw_json TEXT,
        cached_at INTEGER
      );
    `);

    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        label TEXT,
        qr_code TEXT,
        state TEXT,
        version INTEGER,
        lat REAL,
        lng REAL,
        raw_json TEXT,
        updated_at INTEGER
      );
    `);
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_items_qr ON items(qr_code);');
    await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_items_event ON items(event_id);');

    // File d'attente des actions effectuées hors-ligne, en attente de synchronisation.
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        client_action_id TEXT PRIMARY KEY,
        event_id TEXT,
        item_id TEXT,
        from_state TEXT,
        expected_version INTEGER,
        to_state TEXT,
        lat REAL,
        lng REAL,
        note TEXT,
        occurred_at TEXT,
        status TEXT DEFAULT 'pending', -- pending | applied | conflict
        conflict_reason TEXT
      );
    `);
  }

  async execute(sql, params = []) {
    const db = await this.open();
    const [result] = await db.executeSql(sql, params);
    return result;
  }
}

export default new LocalDatabase();
