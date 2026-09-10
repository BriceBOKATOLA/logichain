/**
 * NotificationService - Point d'orchestration des alertes temps réel.
 * Découplé du transport (SSE ou WebSocket) grâce à un "broadcaster" injecté,
 * ce qui respecte l'indépendance du protocole exigée pour la couche Service.
 */
class NotificationService {
  constructor() {
    this.broadcaster = null; // injecté au démarrage du serveur (SSEManager ou SocketManager)
  }

  registerBroadcaster(broadcaster) {
    this.broadcaster = broadcaster;
  }

  notifyZone(eventId, zoneName, payload) {
    if (!this.broadcaster) return;
    this.broadcaster.broadcastToRoom(`event:${eventId}:zone:${zoneName}`, 'critical-alert', payload);
  }

  notifyEvent(eventId, type, payload) {
    if (!this.broadcaster) return;
    this.broadcaster.broadcastToRoom(`event:${eventId}`, type, payload);
  }
}

module.exports = new NotificationService();
