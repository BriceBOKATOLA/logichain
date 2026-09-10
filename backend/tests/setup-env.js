/**
 * setup-env.js — Exécuté par Jest AVANT le chargement du moindre module
 * applicatif (`setupFiles`). Indispensable car `src/config/env.js` valide la
 * configuration au moment du `require` et ferait échouer toute la suite si
 * MONGO_URI ou les secrets JWT étaient absents.
 *
 * Les valeurs ci-dessous sont des secrets de TEST uniquement. Elles ne donnent
 * accès à rien : aucun environnement réel n'utilise NODE_ENV=test.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '4001';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/logichain-test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_fedcba9876543210';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.CORS_ORIGIN = '*';
process.env.TRUST_PROXY = '0';
