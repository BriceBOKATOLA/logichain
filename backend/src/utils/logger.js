const winston = require('winston');
const env = require('../config/env');

/**
 * Logger applicatif unique (singleton) basé sur winston.
 * Silencieux en test pour ne pas polluer la sortie des suites Jest.
 */
const logger = winston.createLogger({
  level: env.logLevel,
  silent: env.isTest,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
