const itemService = require('./ItemService');
const monitoringRepository = require('../repositories/MonitoringRepository');

/**
 * SyncService - Orchestration de la synchronisation "retour de connexion" pour l'app mobile.
 * Consomme la file d'actions envoyée par le client (offline queue) et retourne un rapport
 * détaillé (appliqué / en conflit) que le client utilisera pour son "rollback" visuel.
 */
class SyncService {
  async processBatch(eventId, actions, userId) {
    const startedAt = Date.now();
    const result = await itemService.reconcileOfflineBatch(actions, userId);

    await monitoringRepository.recordMetric(eventId, 'sync', actions.length, {
      applied: result.applied.length,
      conflicts: result.conflicts.length,
      durationMs: Date.now() - startedAt,
    });

    return result;
  }
}

module.exports = new SyncService();
