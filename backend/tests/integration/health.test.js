const request = require('supertest');
const app = require('../../src/app');

describe('Sonde de santé et surface HTTP globale', () => {
  it('GET /health répond 200 quand MongoDB est joignable', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
    expect(res.body.timestamp).toEqual(expect.any(String));
    expect(res.body.uptimeSeconds).toEqual(expect.any(Number));
  });

  it('expose la spécification OpenAPI consommée par Swagger UI', async () => {
    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi || res.body.swagger).toBeDefined();
  });

  it('applique les en-têtes de sécurité Helmet', async () => {
    const res = await request(app).get('/health');

    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(res.headers).toHaveProperty('x-dns-prefetch-control');
    // Helmet doit masquer la signature technologique du serveur.
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('renvoie une 404 normalisée sur une route inconnue', async () => {
    const res = await request(app).get('/api/v1/inexistant');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, statusCode: 404 });
    expect(res.body.message).toMatch(/Route non trouvée/);
  });
});
