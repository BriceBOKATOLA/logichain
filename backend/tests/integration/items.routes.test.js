const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');
const Event = require('../../src/models/schemas/event.schema');
const Item = require('../../src/models/schemas/item.schema');
const env = require('../../src/config/env');

const AGENT_ID = '665f1a2b3c4d5e6f70830001';

function tokenFor(role, sub = AGENT_ID) {
  return jwt.sign({ sub, role }, env.jwt.accessSecret, { expiresIn: '15m' });
}

const VALID_EVENT = {
  name: 'Festival Éco-Responsable 2026',
  startDate: '2026-08-01T00:00:00.000Z',
  endDate: '2026-08-04T00:00:00.000Z',
  status: 'active',
};

const ZONE_A = {
  name: 'Zone A',
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

const ZONE_B = {
  name: 'Zone B',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [3.0, 49.0],
        [3.01, 49.0],
        [3.01, 49.01],
        [3.0, 49.01],
        [3.0, 49.0],
      ],
    ],
  },
};

describe('GET /api/v1/events/:eventId/items — scope par secteur (?zone=)', () => {
  it("ne retourne que le matériel géolocalisé dans la zone demandée, plus tout le matériel encore 'in_stock'", async () => {
    const event = await Event.create({ ...VALID_EVENT, zones: [ZONE_A, ZONE_B] });

    const inZoneA = await Item.create({
      label: 'Groupe électrogène',
      qrCode: 'QR-A-1',
      eventId: event._id,
      state: 'in_transit',
      location: { type: 'Point', coordinates: [2.355, 48.855] }, // à l'intérieur de ZONE_A
    });
    const inZoneB = await Item.create({
      label: 'Barrière Vauban',
      qrCode: 'QR-B-1',
      eventId: event._id,
      state: 'delivered',
      location: { type: 'Point', coordinates: [3.005, 49.005] }, // à l'intérieur de ZONE_B, hors ZONE_A
    });
    const stillInStock = await Item.create({
      label: 'Sonorisation',
      qrCode: 'QR-STOCK-1',
      eventId: event._id,
      state: 'in_stock', // jamais déployé : doit rester visible quelle que soit la zone demandée
      location: { type: 'Point', coordinates: [3.005, 49.005] },
    });

    const res = await request(app)
      .get(`/api/v1/events/${event._id}/items?zone=Zone A`)
      .set('Authorization', `Bearer ${tokenFor('field_agent')}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((it) => it._id);
    expect(ids).toEqual(expect.arrayContaining([inZoneA._id.toString(), stillInStock._id.toString()]));
    expect(ids).not.toContain(inZoneB._id.toString());
  });

  it('ignore le filtre et renvoie la liste complète si le nom de zone est inconnu', async () => {
    const event = await Event.create({ ...VALID_EVENT, zones: [ZONE_A] });
    await Item.create([
      { label: 'Item 1', qrCode: 'QR-X-1', eventId: event._id, state: 'in_transit' },
      { label: 'Item 2', qrCode: 'QR-X-2', eventId: event._id, state: 'delivered' },
    ]);

    const res = await request(app)
      .get(`/api/v1/events/${event._id}/items?zone=Zone Inexistante`)
      .set('Authorization', `Bearer ${tokenFor('field_agent')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('sans paramètre zone, renvoie tout le référentiel (comportement historique inchangé)', async () => {
    const event = await Event.create({ ...VALID_EVENT, zones: [ZONE_A, ZONE_B] });
    await Item.create([
      {
        label: 'Item 1',
        qrCode: 'QR-Y-1',
        eventId: event._id,
        location: { type: 'Point', coordinates: [2.355, 48.855] },
      },
      {
        label: 'Item 2',
        qrCode: 'QR-Y-2',
        eventId: event._id,
        location: { type: 'Point', coordinates: [3.005, 49.005] },
      },
    ]);

    const res = await request(app)
      .get(`/api/v1/events/${event._id}/items`)
      .set('Authorization', `Bearer ${tokenFor('field_agent')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});
