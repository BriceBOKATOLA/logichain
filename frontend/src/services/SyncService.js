import { v4 as uuidv4 } from 'uuid';
import apiClient from './ApiClient';
import syncQueueRepository from '../database/repositories/SyncQueueRepository';
import localItemRepository from '../database/repositories/LocalItemRepository';

/**
 * SyncService — Cœur du fonctionnement Offline-First côté mobile.
 *
 * 1. `recordTransition` applique un "Optimistic UI" local immédiat puis empile
 *    l'action dans la file d'attente SQLite, connecté ou non.
 * 2. `flush` est appelée au retour réseau (ou manuellement depuis le Centre de
 *    synchronisation) : elle envoie le lot au serveur et réconcilie les résultats
 *    (succès -> version bumpée ; conflit -> rollback visuel + notification).
 */
class SyncService {
  /**
   * Enregistre une transition d'état de manière optimiste (UI + file d'attente locale).
   * `fromState`/`expectedVersion` sont relus depuis le cache local juste avant application,
   * afin que la file conserve l'état exact à restaurer en cas de rollback (voir discardConflict).
   */
  async recordTransition({ eventId, itemId, expectedVersion, toState, location, note }) {
    const clientActionId = uuidv4();
    const current = await localItemRepository.findById(itemId);
    const fromState = current?.state;
    const versionToUse = current?.version ?? expectedVersion;

    await localItemRepository.applyOptimisticTransition(itemId, toState, location ? { lat: location.coordinates[1], lng: location.coordinates[0] } : null);

    await syncQueueRepository.enqueue({
      clientActionId,
      eventId,
      itemId,
      fromState,
      expectedVersion: versionToUse,
      toState,
      location,
      note,
      occurredAt: new Date().toISOString(),
    });

    return clientActionId;
  }

  /**
   * Tente de vider la file d'attente vers le serveur. Idempotent et sûr à rappeler
   * plusieurs fois (ex: à chaque retour de connectivité détecté par useNetworkStatus).
   */
  async flush(eventId) {
    const pending = await syncQueueRepository.getPending(eventId);
    if (pending.length === 0) return { applied: 0, conflicts: 0 };

    const { data } = await apiClient.post(`/events/${eventId}/items/sync`, { actions: pending });
    const { applied, conflicts } = data.data;

    for (const ok of applied) {
      await syncQueueRepository.markApplied(ok.clientActionId);
      await localItemRepository.bumpVersion(ok.itemId, ok.version);
    }

    for (const conflict of conflicts) {
      await syncQueueRepository.markConflict(conflict.clientActionId, conflict.reason);
      // Le rollback visuel définitif n'est PAS automatique : il est déclenché depuis
      // le Centre de synchronisation (discardConflict), après consultation explicite
      // de l'utilisateur, pour ne jamais lui faire perdre une action silencieusement.
    }

    return { applied: applied.length, conflicts: conflicts.length };
  }

  async getPendingCount(eventId) {
    return syncQueueRepository.countPending(eventId);
  }

  async getConflicts(eventId) {
    return syncQueueRepository.getConflicts(eventId);
  }

  /**
   * Abandonne définitivement une action en conflit : rollback visuel exact
   * (état + version restaurés tels qu'avant la tentative) puis suppression de la file.
   */
  async discardConflict(clientActionId) {
    const action = await syncQueueRepository.getById(clientActionId);
    if (!action) return;
    await localItemRepository.rollback(action.itemId, action.fromState, action.expectedVersion);
    await syncQueueRepository.remove(clientActionId);
  }

  /**
   * Rejoue une action en conflit (même expectedVersion) lors du prochain flush —
   * utile si le conflit venait d'un simple aléa réseau plutôt que d'une vraie
   * modification concurrente.
   */
  async retryConflict(clientActionId) {
    await syncQueueRepository.requeue(clientActionId);
  }
}

export default new SyncService();
