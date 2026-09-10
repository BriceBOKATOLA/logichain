const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');
const Event = require('../../src/models/schemas/event.schema');
const Item = require('../../src/models/schemas/item.schema');
const env = require('../../src/config/env');

const ADMIN_ID = '665f1a2b3c4d5e6f70820001';
const AGENT_ID = '665f1a2b3c4d5e6f70820002';

/** Forge un access token valide : ces tests ciblent le RBAC, pas le parcours de login. */
function tokenFor(role, sub = ADMIN_ID) {
  return jwt.sign({ sub, role }, env.jwt.accessSecret, { expiresIn: '15m' });
}

const VALID_EVENT = {
  name: 'Festival Eco-Responsable 2026',
  startDate: '2026-08-01T00:00:00.000Z',
  endDate: '2026-08-04T00:00:00.000Z',
  status: 'active',
};

const ZONE = {
  name: 'Zone Scène Principale',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [2.35, 48.85],
        [2.36, 48.85],
        [2.36, 48.86],
        [2.35, 48.86],
        [2.35, 48.85],
      ],
    ],
  },
};

describe('Contrôle d’accès sur /api/v1/events', () => {
  it('refuse tout accès sans jeton (401)', async () => {
    await request(app).get('/api/v1/events').expect(401);
    await request(app).post('/api/v1/events').send(VALID_EVENT).expect(401);
  });

  it('refuse un jeton signé avec une clé inconnue (401)', async () => {
    const forged = jwt.sign({ sub: ADMIN_ID, role: 'admin' }, 'cle-attaquant-0123456789');

    await request(app).get('/api/v1/events').set('Authorization', `Bearer ${forged}`).expect(401);
  });

  it('refuse la création à un agent de terrain (403) mais autorise la lecture', async () => {
    const agent = tokenFor('field_agent', AGENT_ID);

    await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${agent}`)
      .send(VALID_EVENT)
      .expect(403);

    await request(app).get('/api/v1/events').set('Authorization', `Bearer ${agent}`).expect(200);
  });

  it('réserve la suppression au seul rôle admin (403 pour logistics_manager)', async () => {
    const created = await Event.create(VALID_EVENT);

    await request(app)
      .delete(`/api/v1/events/${created._id}`)
      .set('Authorization', `Bearer ${tokenFor('logistics_manager')}`)
      .expect(403);

    expect(await Event.countDocuments()).toBe(1);
  });
});

describe('POST /api/v1/events', () => {
  it('crée un événement et le persiste en base', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send(VALID_EVENT);

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(VALID_EVENT.name);

    const stored = await Event.findById(res.body.data._id);
    expect(stored.status).toBe('active');
  });

  it('refuse une date de fin antérieure à la date de début (422)', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ ...VALID_EVENT, endDate: '2026-07-01T00:00:00.000Z' });

    expect(res.status).toBe(422);
    expect(await Event.countDocuments()).toBe(0);
  });

  it('refuse un nom trop court (422)', async () => {
    await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ ...VALID_EVENT, name: 'AB' })
      .expect(422);
  });
});

describe('GET /api/v1/events', () => {
  it('renvoie une liste paginée avec ses métadonnées', async () => {
    await Event.create([VALID_EVENT, { ...VALID_EVENT, name: 'Salon du Livre 2026', status: 'draft' }]);

    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${tokenFor('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 2, page: 1, pages: 1 });
  });

  it('filtre par statut', async () => {
    await Event.create([VALID_EVENT, { ...VALID_EVENT, name: 'Salon 2026', status: 'draft' }]);

    const res = await request(app)
      .get('/api/v1/events?status=draft')
      .set('Authorization', `Bearer ${tokenFor('admin')}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('draft');
  });
});

describe('GET /api/v1/events/active', () => {
  it("retourne l'événement actif démarré le plus récemment", async () => {
    await Event.create([
      {
        ...VALID_EVENT,
        name: 'Ancien Festival',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-05T00:00:00.000Z',
      },
      { ...VALID_EVENT, name: 'Festival Récent', startDate: '2026-08-01T00:00:00.000Z' },
      { ...VALID_EVENT, name: 'Brouillon', status: 'draft' },
    ]);

    const res = await request(app)
      .get('/api/v1/events/active')
      .set('Authorization', `Bearer ${tokenFor('field_agent', AGENT_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Festival Récent');
  });

  it('renvoie 404 quand aucun événement actif n’existe', async () => {
    await Event.create({ ...VALID_EVENT, status: 'draft' });

    await request(app)
      .get('/api/v1/events/active')
      .set('Authorization', `Bearer ${tokenFor('field_agent', AGENT_ID)}`)
      .expect(404);
  });
});

describe('GET /api/v1/events/:id', () => {
  it('renvoie 404 sur un identifiant valide mais inexistant', async () => {
    await request(app)
      .get('/api/v1/events/665f1a2b3c4d5e6f7099ffff')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .expect(404);
  });

  it('renvoie 400 sur un identifiant Mongo malformé', async () => {
    await request(app)
      .get('/api/v1/events/pas-un-objectid')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .expect(400);
  });
});

describe('POST /api/v1/events/:id/zones', () => {
  it('ajoute une zone GeoJSON Polygon', async () => {
    const created = await Event.create(VALID_EVENT);

    const res = await request(app)
      .post(`/api/v1/events/${created._id}/zones`)
      .set('Authorization', `Bearer ${tokenFor('logistics_manager')}`)
      .send(ZONE);

    expect(res.status).toBe(200);
    expect(res.body.data.zones).toHaveLength(1);
    expect(res.body.data.zones[0].geometry.type).toBe('Polygon');
  });

  it('refuse une géométrie qui n’est pas un Polygon (422)', async () => {
    const created = await Event.create(VALID_EVENT);

    await request(app)
      .post(`/api/v1/events/${created._id}/zones`)
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ name: 'Zone', geometry: { type: 'Point', coordinates: [2.35, 48.85] } })
      .expect(422);
  });
});

describe('DELETE /api/v1/events/:id — intégrité référentielle', () => {
  it('refuse la suppression tant que du matériel est rattaché (409)', async () => {
    const created = await Event.create(VALID_EVENT);
    await Item.create({ label: 'Groupe électrogène', qrCode: 'QR-9001', eventId: created._id });

    const res = await request(app)
      .delete(`/api/v1/events/${created._id}`)
      .set('Authorization', `Bearer ${tokenFor('admin')}`);

    expect(res.status).toBe(409);
    expect(await Event.countDocuments()).toBe(1);
  });

  it('supprime un événement vide', async () => {
    const created = await Event.create(VALID_EVENT);

    await request(app)
      .delete(`/api/v1/events/${created._id}`)
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .expect(200);

    expect(await Event.countDocuments()).toBe(0);
  });
});
