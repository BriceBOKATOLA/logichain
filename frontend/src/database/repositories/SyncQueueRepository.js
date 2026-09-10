import db from '../db';

/**
 * SyncQueueRepository — Empile les actions effectuées hors-réseau et pilote
 * leur cycle de vie (pending -> applied | conflict). Garantit "aucune perte de
 * données lors des phases de transition réseau" (cahier des charges §5).
 */
class SyncQueueRepository {
  async enqueue(action) {
    await db.execute(
      `INSERT INTO sync_queue
        (client_action_id, event_id, item_id, from_state, expected_version, to_state, lat, lng, note, occurred_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        action.clientActionId, action.eventId, action.itemId, action.fromState ?? null,
        action.expectedVersion, action.toState,
        action.location?.coordinates?.[1] ?? null, action.location?.coordinates?.[0] ?? null,
        action.note ?? '', action.occurredAt,
      ],
    );
  }

  async getPending(eventId) {
    const result = await db.execute("SELECT * FROM sync_queue WHERE event_id = ? AND status = 'pending' ORDER BY occurred_at ASC", [eventId]);
    const rows = [];
    for (let i = 0; i < result.rows.length; i += 1) rows.push(this._toAction(result.rows.item(i)));
    return rows;
  }

  /**
   * Identifiants des items ayant une action non résolue (pending OU conflict).
   * Sert à protéger ces items d'un écrasement silencieux lors d'un rafraîchissement
   * serveur (voir LocalItemRepository.upsertMany), tant que l'utilisateur n'a pas
   * lui-même tranché le conflit depuis le Centre de synchronisation.
   */
  async getUnresolvedItemIds(eventId) {
    const result = await db.execute(
      "SELECT DISTINCT item_id FROM sync_queue WHERE event_id = ? AND status IN ('pending', 'conflict')",
      [eventId],
    );
    const ids = [];
    for (let i = 0; i < result.rows.length; i += 1) ids.push(result.rows.item(i).item_id);
    return ids;
  }

  async countPending(eventId) {
    const result = await db.execute("SELECT COUNT(*) as c FROM sync_queue WHERE event_id = ? AND status = 'pending'", [eventId]);
    return result.rows.item(0).c;
  }

  async markApplied(clientActionId) {
    await db.execute("UPDATE sync_queue SET status = 'applied' WHERE client_action_id = ?", [clientActionId]);
  }

  async markConflict(clientActionId, reason) {
    await db.execute("UPDATE sync_queue SET status = 'conflict', conflict_reason = ? WHERE client_action_id = ?", [reason, clientActionId]);
  }

  async getConflicts(eventId) {
    const result = await db.execute("SELECT * FROM sync_queue WHERE event_id = ? AND status = 'conflict'", [eventId]);
    const rows = [];
    for (let i = 0; i < result.rows.length; i += 1) rows.push(this._toAction(result.rows.item(i)));
    return rows;
  }

  async getById(clientActionId) {
    const result = await db.execute('SELECT * FROM sync_queue WHERE client_action_id = ? LIMIT 1', [clientActionId]);
    return result.rows.length ? this._toAction(result.rows.item(0)) : null;
  }

  /** Supprime définitivement une entrée (après résolution manuelle d'un conflit). */
  async remove(clientActionId) {
    await db.execute('DELETE FROM sync_queue WHERE client_action_id = ?', [clientActionId]);
  }

  /** Repasse une action en conflit au statut "pending" pour la rejouer avec la même version. */
  async requeue(clientActionId) {
    await db.execute("UPDATE sync_queue SET status = 'pending', conflict_reason = NULL WHERE client_action_id = ?", [clientActionId]);
  }

  _toAction(row) {
    return {
      clientActionId: row.client_action_id,
      itemId: row.item_id,
      fromState: row.from_state,
      expectedVersion: row.expected_version,
      toState: row.to_state,
      location: row.lat != null ? { type: 'Point', coordinates: [row.lng, row.lat] } : undefined,
      note: row.note,
      occurredAt: row.occurred_at,
      status: row.status,
      conflictReason: row.conflict_reason,
    };
  }
}

export default new SyncQueueRepository();
