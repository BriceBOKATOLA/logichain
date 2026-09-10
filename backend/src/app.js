const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const env = require('./config/env');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const { mountSwagger } = require('./config/swagger');
const ApiError = require('./utils/ApiError');

/**
 * Application - Assemble les couches transverses (sécurité, compression, rate-limit)
 * et monte le routeur applicatif. Aucune logique métier ici : uniquement du câblage.
 */
class Application {
  constructor() {
    this.app = express();
    this._configureProxy();
    this._configureMiddlewares();
    this._configureRoutes();
    this._configureErrorHandling();
  }

  /**
   * En production l'API tourne derrière Nginx (rôle Ansible web_proxy). Sans
   * `trust proxy`, Express voit l'IP du reverse proxy pour TOUTES les requêtes :
   * le rate-limit deviendrait global au lieu d'être par client, et un seul agent
   * de terrain pourrait bloquer l'ensemble du festival.
   */
  _configureProxy() {
    this.app.set('trust proxy', env.trustProxy);
  }

  _configureMiddlewares() {
    this.app.use(helmet());
    this.app.use(cors({ origin: env.corsOrigin }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '2mb' }));

    // Protection contre les scans massifs / abus lors des pics de charge (montage/démontage).
    // Désactivé en test : les suites d'intégration enchaînent des dizaines de requêtes
    // depuis la même IP et seraient rejetées de manière non déterministe.
    if (!env.isTest) {
      this.app.use(
        rateLimit({
          windowMs: env.rateLimit.windowMs,
          max: env.rateLimit.max,
          standardHeaders: true,
          legacyHeaders: false,
        }),
      );
    }
  }

  _configureRoutes() {
    // Sonde de vivacité consommée par Nginx, PM2 et le job de smoke-test du pipeline CD.
    this.app.get('/health', (req, res) => {
      const dbConnected = mongoose.connection.readyState === 1;
      return res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'ok' : 'degraded',
        database: dbConnected ? 'connected' : 'disconnected',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    });

    mountSwagger(this.app);
    this.app.use('/api/v1', routes);
    this.app.use((req, res, next) =>
      next(ApiError.notFound(`Route non trouvée: ${req.method} ${req.originalUrl}`)),
    );
  }

  _configureErrorHandling() {
    this.app.use(errorMiddleware);
  }

  getExpressApp() {
    return this.app;
  }
}

module.exports = new Application().getExpressApp();
