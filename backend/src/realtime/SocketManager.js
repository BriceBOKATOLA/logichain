const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * SocketManager - Encapsule Socket.IO (WebSockets) pour la diffusion d'alertes temps réel.
 * Fournit une API "broadcastToRoom" générique consommée par NotificationService,
 * qui reste ainsi agnostique du transport réel.
 */
class SocketManager {
  constructor() {
    this.io = null;
  }

  attach(httpServer, corsOrigin = env.corsOrigin) {
    this.io = new Server(httpServer, {
      cors: { origin: corsOrigin },
    });

    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        const payload = jwt.verify(token, env.jwt.accessSecret);
        socket.user = payload;
        next();
      } catch {
        next(new Error('Authentification WebSocket invalide.'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info(`Client WebSocket connecté: ${socket.id}`);

      socket.on('join', (room) => socket.join(room));
      socket.on('leave', (room) => socket.leave(room));
      socket.on('disconnect', () => logger.info(`Client WebSocket déconnecté: ${socket.id}`));
    });

    return this.io;
  }

  broadcastToRoom(room, event, payload) {
    if (!this.io) return;
    this.io.to(room).emit(event, payload);
  }
}

module.exports = new SocketManager();
