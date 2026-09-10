const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

/**
 * DatabaseConnection - Singleton responsable du cycle de vie de la connexion MongoDB.
 * Encapsule la configuration (Replica Set, transactions ACID, retryWrites) et
 * expose un point d'accès unique afin qu'aucune autre couche que les Repositories
 * n'ait à se soucier de la connexion brute.
 */
class DatabaseConnection {
  constructor() {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }
    this.connection = null;
    DatabaseConnection.instance = this;
  }

  async connect(uri = env.mongoUri) {
    if (this.connection) return this.connection;

    mongoose.set('strictQuery', true);

    this.connection = await mongoose.connect(uri, {
      // En production les index sont créés explicitement par `npm run db:indexes`
      // (rôle Ansible database) et non à chaud au démarrage, pour ne pas bloquer
      // le boot de l'API ni verrouiller une collection en pleine exploitation.
      autoIndex: !env.isProduction,
      maxPoolSize: 20,
      retryWrites: true,
    });

    logger.info(`MongoDB connecté: ${mongoose.connection.host}`);

    mongoose.connection.on('error', (err) => logger.error('Erreur MongoDB', { err: err.message }));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB déconnecté'));

    return this.connection;
  }

  /**
   * Exécute une fonction dans une transaction ACID (multi-documents).
   * Utilisé par les Services qui doivent garantir l'atomicité (ex: transfert de responsabilité).
   */
  async withTransaction(fn) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      session.endSession();
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
    }
  }
}

module.exports = new DatabaseConnection();
