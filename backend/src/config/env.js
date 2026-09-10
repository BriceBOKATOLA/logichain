const path = require('path');
const Joi = require('joi');

// Le fichier .env n'existe qu'en local : en production, les variables sont
// injectées par systemd/PM2 (cf. rôle Ansible app_runtime) et en CI par les
// GitHub Secrets. `dotenv` ne doit donc jamais écraser une variable déjà définie.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Valeurs de secrets livrées dans `.env.example` : elles sont utiles en local
 * mais doivent faire échouer le démarrage en production. C'est la traduction
 * technique de l'exigence « étanchéité stricte des secrets d'environnement ».
 */
const PLACEHOLDER_SECRETS = [
  'change_me',
  'change_me_access_secret',
  'change_me_refresh_secret',
  'secret',
  'changeme',
];

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),

  MONGO_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),

  // Liste d'origines séparées par des virgules. `*` est toléré hors production.
  CORS_ORIGIN: Joi.string().default('*'),

  // Nombre de proxies de confiance devant l'API (Nginx = 1). Indispensable pour
  // que express-rate-limit voie la vraie IP cliente et non celle du reverse proxy.
  TRUST_PROXY: Joi.number().integer().min(0).max(10).default(0),

  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60 * 1000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(300),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
})
  .unknown(true)
  .required();

function loadEnv(source = process.env) {
  const { value, error } = schema.validate(source, { abortEarly: false, stripUnknown: false });

  if (error) {
    const details = error.details.map((d) => `  - ${d.message}`).join('\n');
    throw new Error(`Configuration d'environnement invalide :\n${details}`);
  }

  const isProduction = value.NODE_ENV === 'production';

  if (isProduction) {
    const weak = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter((key) =>
      PLACEHOLDER_SECRETS.includes(String(value[key]).toLowerCase()),
    );
    if (weak.length) {
      throw new Error(
        `Secrets par défaut interdits en production : ${weak.join(', ')}. ` +
          'Générez-les avec `openssl rand -hex 32` et injectez-les via Ansible Vault / GitHub Secrets.',
      );
    }

    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      throw new Error('JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être distincts en production.');
    }

    if (value.CORS_ORIGIN === '*') {
      throw new Error(
        'CORS_ORIGIN="*" est interdit en production : déclarez explicitement les origines autorisées.',
      );
    }
  }

  return {
    nodeEnv: value.NODE_ENV,
    isProduction,
    isTest: value.NODE_ENV === 'test',
    port: value.PORT,
    mongoUri: value.MONGO_URI,
    jwt: {
      accessSecret: value.JWT_ACCESS_SECRET,
      refreshSecret: value.JWT_REFRESH_SECRET,
      accessExpires: value.JWT_ACCESS_EXPIRES,
      refreshExpires: value.JWT_REFRESH_EXPIRES,
    },
    corsOrigin: value.CORS_ORIGIN === '*' ? '*' : value.CORS_ORIGIN.split(',').map((o) => o.trim()),
    trustProxy: value.TRUST_PROXY,
    rateLimit: {
      windowMs: value.RATE_LIMIT_WINDOW_MS,
      max: value.RATE_LIMIT_MAX,
    },
    logLevel: value.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  };
}

module.exports = loadEnv();
module.exports.loadEnv = loadEnv;
module.exports.PLACEHOLDER_SECRETS = PLACEHOLDER_SECRETS;
