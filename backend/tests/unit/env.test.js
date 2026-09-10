const { loadEnv } = require('../../src/config/env');

/**
 * Ces tests verrouillent l'exigence non-fonctionnelle « étanchéité stricte des
 * secrets » : la configuration doit REFUSER de démarrer en production plutôt que
 * de tourner avec les valeurs de démonstration du fichier .env.example.
 */
describe('config/env — validation stricte', () => {
  const base = {
    NODE_ENV: 'production',
    PORT: '4000',
    MONGO_URI: 'mongodb://app:pwd@127.0.0.1:27017/logichain?authSource=logichain',
    JWT_ACCESS_SECRET: 'a'.repeat(48),
    JWT_REFRESH_SECRET: 'b'.repeat(48),
    CORS_ORIGIN: 'https://logichain.example.com',
  };

  it('accepte une configuration de production complète', () => {
    const env = loadEnv(base);
    expect(env.isProduction).toBe(true);
    expect(env.port).toBe(4000);
    expect(env.corsOrigin).toEqual(['https://logichain.example.com']);
  });

  it('applique les valeurs par défaut documentées', () => {
    const env = loadEnv({ ...base, NODE_ENV: 'development', CORS_ORIGIN: undefined });
    expect(env.jwt.accessExpires).toBe('15m');
    expect(env.jwt.refreshExpires).toBe('7d');
    expect(env.corsOrigin).toBe('*');
    expect(env.trustProxy).toBe(0);
    expect(env.rateLimit).toEqual({ windowMs: 60000, max: 300 });
  });

  it('échoue si MONGO_URI est absent', () => {
    expect(() => loadEnv({ ...base, MONGO_URI: undefined })).toThrow(/MONGO_URI/);
  });

  it('échoue si un secret JWT est trop court', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'court' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('refuse les secrets de démonstration en production', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'change_me_access_secret' })).toThrow(
      /Secrets par défaut interdits/,
    );
  });

  it('refuse deux secrets JWT identiques en production', () => {
    const same = 'c'.repeat(48);
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: same, JWT_REFRESH_SECRET: same })).toThrow(
      /distincts/,
    );
  });

  it('refuse un CORS ouvert à tous en production', () => {
    expect(() => loadEnv({ ...base, CORS_ORIGIN: '*' })).toThrow(/CORS_ORIGIN/);
  });

  it('tolère ces mêmes valeurs en développement', () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: 'change_me_access_secret',
      JWT_REFRESH_SECRET: 'change_me_refresh_secret',
      CORS_ORIGIN: '*',
    });
    expect(env.isProduction).toBe(false);
    expect(env.corsOrigin).toBe('*');
  });

  it('découpe une liste d’origines CORS séparées par des virgules', () => {
    const env = loadEnv({ ...base, CORS_ORIGIN: 'https://a.example.com, https://b.example.com' });
    expect(env.corsOrigin).toEqual(['https://a.example.com', 'https://b.example.com']);
  });
});
