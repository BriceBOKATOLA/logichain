const http = require('http');
const env = require('./config/env');
const app = require('./app');
const db = require('./config/database');
const socketManager = require('./realtime/SocketManager');
const notificationService = require('./services/NotificationService');
const logger = require('./utils/logger');

/**
 * Bootstrap - Point d'entrée du processus. Connecte la base, attache le serveur
 * WebSocket au serveur HTTP et enregistre le broadcaster auprès du NotificationService.
 */
async function bootstrap() {
  await db.connect();

  const httpServer = http.createServer(app);
  socketManager.attach(httpServer, env.corsOrigin);
  notificationService.registerBroadcaster(socketManager);

  httpServer.listen(env.port, () => {
    logger.info(`LogiChain API démarrée sur le port ${env.port} (env: ${env.nodeEnv})`);
    logger.info('Documentation Swagger disponible sur /api-docs');
  });

  /**
   * Arrêt gracieux : PM2 (rôle Ansible app_runtime) envoie SIGINT puis attend
   * `kill_timeout` avant SIGKILL. On ferme d'abord le serveur HTTP pour cesser
   * d'accepter du trafic, puis la connexion MongoDB, afin qu'un `pm2 reload`
   * pendant un déploiement ne coupe aucune requête en cours.
   */
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Signal ${signal} reçu — arrêt du serveur en cours...`);

    const forceExit = setTimeout(() => {
      logger.error('Arrêt gracieux trop long, sortie forcée.');
      process.exit(1);
    }, 10000);
    forceExit.unref();

    await new Promise((resolve) => {
      httpServer.close(resolve);
    });
    await db.disconnect();
    logger.info('Arrêt terminé proprement.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Un rejet de promesse non capté laisserait le processus dans un état incohérent
// sans que PM2 ne le redémarre : on le transforme en sortie explicite.
process.on('unhandledRejection', (reason) => {
  logger.error('Rejet de promesse non géré', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Exception non capturée', { err: err.message, stack: err.stack });
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error('Échec du démarrage', { err: err.message });
  process.exit(1);
});
