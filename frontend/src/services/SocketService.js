import { io } from 'socket.io-client';
import authService from './AuthService';
import { SOCKET_URL } from '../config/env';

/**
 * SocketService — Client WebSocket pour la réception d'alertes critiques poussées
 * par le serveur (modification d'urgence sur le secteur assigné).
 */
class SocketService {
  constructor() {
    this.socket = null;
  }

  async connect(eventId, onAlert) {
    const token = await authService.getAccessToken();
    this.socket = io(SOCKET_URL, { auth: { token } });

    this.socket.on('connect', () => this.socket.emit('join', `event:${eventId}`));
    this.socket.on('critical-alert', onAlert);
    this.socket.on('anomaly-declared', onAlert);

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export default new SocketService();
