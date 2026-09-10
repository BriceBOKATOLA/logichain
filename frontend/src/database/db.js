import * as SQLite from 'expo-sqlite';

/**
 * LocalDatabase — Singleton encapsulant la base SQLite embarquée (Offline-First).
 * Aucune autre couche que les *Repository de ce dossier ne doit importer SQLite
 * directement : c'est le pendant mobile de la règle « Repository = seul accès aux données ».
 *
 * `execute()` expose délibérément la forme de résultat historique
 * (`result.rows.length` / `result.rows.item(i)`), héritée de l'API WebSQL. Les
 * Repository sont écrits contre ce contrat ; l'adaptation vers l'API moderne
 * d'expo-sqlite est confinée ici, ce qui évite de propager un détail de
 * bibliothèque dans toute la couche de données.
 */
class LocalDatabase {
  constructor() {
    if (LocalDatabase.instance) return LocalDatabase.instance;
    this.db = null;
    this.opening = null;
    LocalDatabase.instance = this;
  }

  async open() {
    if (this.db) return this.db;

    // Plusieurs écrans peuvent demander la base simultanément au démarrage.
    // Sans cette promesse partagée, on ouvrirait la base plusieurs fois et on
    // rejouerait les migrations en parallèle.
    if (!this.opening) {
      this.opening = (async () => {
        const db = await SQLite.openDatabaseAsync('logichain.db');
        this.db = db;
        await this._migrate();
        return db;
      })();
    }

    return this.opening;
  }

  async _migrate() {
    // `execAsync` accepte plusieurs instructions : la migration est appliquée
    // en un seul aller-retour vers le moteur SQLite.
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT,
        status TEXT,
        raw_json TEXT,
        cached_at INTEGER
      );

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

      CREATE INDEX IF NOT EXISTS idx_items_qr ON items(qr_code);
      CREATE INDEX IF NOT EXISTS idx_items_event ON items(event_id);

      -- File d'attente des actions effectuées hors-ligne, en attente de synchronisation.
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

      CREATE INDEX IF NOT EXISTS idx_queue_event_status ON sync_queue(event_id, status);
    `);
  }

  /**
   * Exécute une requête SQL et renvoie un résultat de forme WebSQL.
   * @returns {{ rows: { length: number, item: (i: number) => object, _array: object[] },
   *             rowsAffected: number, insertId: number|null }}
   */
  async execute(sql, params = []) {
    const db = await this.open();
    const isSelect = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);

    if (isSelect) {
      const rows = await db.getAllAsync(sql, params);
      return {
        rows: {
          length: rows.length,
          item: (index) => rows[index],
          _array: rows,
        },
        rowsAffected: 0,
        insertId: null,
      };
    }

    const result = await db.runAsync(sql, params);
    return {
      rows: { length: 0, item: () => undefined, _array: [] },
      rowsAffected: result.changes ?? 0,
      insertId: result.lastInsertRowId ?? null,
    };
  }
}

export default new LocalDatabase();
