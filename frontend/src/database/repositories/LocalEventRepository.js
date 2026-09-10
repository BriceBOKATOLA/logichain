import db from '../db';

class LocalEventRepository {
  async upsert(event) {
    await db.execute(
      `INSERT INTO events (id, name, status, raw_json, cached_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, status=excluded.status, raw_json=excluded.raw_json, cached_at=excluded.cached_at`,
      [event._id, event.name, event.status, JSON.stringify(event), Date.now()],
    );
  }

  async getById(id) {
    const result = await db.execute('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);
    return result.rows.length ? JSON.parse(result.rows.item(0).raw_json) : null;
  }

  /**
   * Retourne le dernier événement mis en cache (utilisé par EventContext quand
   * le serveur est injoignable au démarrage : on continue de travailler hors-ligne
   * sur le dernier événement connu).
   */
  async getLastCached() {
    const result = await db.execute('SELECT * FROM events ORDER BY cached_at DESC LIMIT 1');
    return result.rows.length ? JSON.parse(result.rows.item(0).raw_json) : null;
  }
}

export default new LocalEventRepository();
