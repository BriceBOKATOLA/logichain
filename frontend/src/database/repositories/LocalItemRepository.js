import db from '../db';

/**
 * LocalItemRepository — Accès exclusif à la table `items` en SQLite.
 * Sert de cache local pour un fonctionnement 100% offline-first.
 */
class LocalItemRepository {
  /**
   * @param {Array} items - Items renvoyés par le serveur.
   * @param {string[]} protectedItemIds - Items à ne PAS écraser sur state/version/location
   *   (action offline pending ou conflit non résolu). Voir SyncQueueRepository.getUnresolvedItemIds.
   */
  async upsertMany(items, protectedItemIds = []) {
    const protectedSet = new Set(protectedItemIds);
    for (const item of items) {
      await this.upsert(item, protectedSet.has(item._id));
    }
  }

  async upsert(item, isProtected = false) {
    const lat = item.location?.coordinates?.[1] ?? null;
    const lng = item.location?.coordinates?.[0] ?? null;

    if (isProtected) {
      // On ne touche PAS state/version/lat/lng : une action locale non synchronisée
      // les rend provisoirement plus légitimes que la dernière valeur connue du serveur.
      // On rafraîchit uniquement les métadonnées stables (label, référentiel complet).
      await db.execute(
        `INSERT INTO items (id, event_id, label, qr_code, state, version, lat, lng, raw_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET label=excluded.label`,
        [item._id, item.eventId, item.label, item.qrCode, item.state, item.version, lat, lng, JSON.stringify(item), Date.now()],
      );
      return;
    }

    await db.execute(
      `INSERT INTO items (id, event_id, label, qr_code, state, version, lat, lng, raw_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         label=excluded.label, state=excluded.state, version=excluded.version,
         lat=excluded.lat, lng=excluded.lng, raw_json=excluded.raw_json, updated_at=excluded.updated_at`,
      [item._id, item.eventId, item.label, item.qrCode, item.state, item.version, lat, lng, JSON.stringify(item), Date.now()],
    );
  }

  async findByQrCode(qrCode) {
    const result = await db.execute('SELECT * FROM items WHERE qr_code = ? LIMIT 1', [qrCode]);
    return result.rows.length ? this._parse(result.rows.item(0)) : null;
  }

  async findByEvent(eventId) {
    const result = await db.execute('SELECT * FROM items WHERE event_id = ? ORDER BY updated_at DESC', [eventId]);
    const rows = [];
    for (let i = 0; i < result.rows.length; i += 1) rows.push(this._parse(result.rows.item(i)));
    return rows;
  }

  async findById(itemId) {
    const result = await db.execute('SELECT * FROM items WHERE id = ? LIMIT 1', [itemId]);
    return result.rows.length ? this._parse(result.rows.item(0)) : null;
  }

  /**
   * Applique localement une transition en mode "optimistic UI" : l'UI reflète
   * immédiatement le nouvel état, avant même la confirmation serveur.
   *
   * IMPORTANT : on incrémente aussi la version locale de façon spéculative.
   * Sans cela, deux scans successifs du même item pendant la même session
   * hors-ligne enverraient tous les deux le même `expectedVersion` au serveur,
   * et le second serait systématiquement rejeté en conflit (409) alors qu'il
   * n'y a pourtant eu aucune modification concurrente réelle.
   */
  async applyOptimisticTransition(itemId, toState, coords) {
    await db.execute(
      'UPDATE items SET state = ?, lat = ?, lng = ?, version = version + 1, updated_at = ? WHERE id = ?',
      [toState, coords?.lat ?? null, coords?.lng ?? null, Date.now(), itemId],
    );
  }

  /**
   * Rollback visuel exact après un conflit définitif : restaure l'état ET la version
   * telle qu'elle était avant la transition abandonnée (valeurs connues via la file
   * d'attente, voir SyncQueueRepository — jamais une simple décrémentation devinée).
   */
  async rollback(itemId, previousState, previousVersion) {
    await db.execute(
      'UPDATE items SET state = ?, version = ?, updated_at = ? WHERE id = ?',
      [previousState, previousVersion, Date.now(), itemId],
    );
  }

  async bumpVersion(itemId, newVersion) {
    await db.execute('UPDATE items SET version = ? WHERE id = ?', [newVersion, itemId]);
  }

  _parse(row) {
    const base = JSON.parse(row.raw_json);
    return {
      ...base,
      state: row.state,
      version: row.version,
      // Les coordonnées peuvent avoir été mises à jour localement par une transition
      // optimiste avant toute synchronisation : elles font autorité sur celles du JSON figé.
      location: (row.lat != null && row.lng != null)
        ? { type: 'Point', coordinates: [row.lng, row.lat] }
        : base.location,
    };
  }
}

export default new LocalItemRepository();
