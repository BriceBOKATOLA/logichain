const BaseEntity = require('../../src/entities/BaseEntity');
const UserEntity = require('../../src/entities/User.entity');
const EventEntity = require('../../src/entities/Event.entity');

describe('BaseEntity', () => {
  it('interdit son instanciation directe (classe abstraite)', () => {
    expect(() => new BaseEntity()).toThrow(/abstraite/i);
  });
});

describe('UserEntity', () => {
  const valid = {
    email: 'agent@logichain.io',
    passwordHash: '$2a$12$hashfictif',
    fullName: 'Agent Terrain',
    role: 'field_agent',
  };

  it('accepte un utilisateur valide', () => {
    const user = new UserEntity(valid);
    expect(user.email).toBe('agent@logichain.io');
    expect(user.assignedZone).toBeNull();
  });

  it('refuse une adresse email malformée avec un 422', () => {
    const build = () => new UserEntity({ ...valid, email: 'pas-un-email' });

    expect(build).toThrow(/email/i);
    expect(build).toThrow(expect.objectContaining({ statusCode: 422 }));
  });

  it('refuse un rôle hors référentiel', () => {
    expect(() => new UserEntity({ ...valid, role: 'super_admin' })).toThrow(/Rôle invalide/);
  });

  it('identifie les acteurs de terrain', () => {
    expect(new UserEntity(valid).isFieldActor()).toBe(true);
    expect(new UserEntity({ ...valid, role: 'admin' }).isFieldActor()).toBe(false);
  });
});

describe('EventEntity', () => {
  const valid = {
    name: 'Festival Eco-Responsable 2026',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-08-04T00:00:00.000Z',
  };

  it('accepte un événement valide et le place en brouillon par défaut', () => {
    const event = new EventEntity(valid);
    expect(event.status).toBe('draft');
    expect(event.isActive()).toBe(false);
  });

  it('refuse une date de fin antérieure à la date de début', () => {
    expect(() => new EventEntity({ ...valid, endDate: '2026-07-01T00:00:00.000Z' })).toThrow(
      /date de début doit précéder/i,
    );
  });

  it('refuse un nom de moins de 3 caractères', () => {
    expect(() => new EventEntity({ ...valid, name: 'AB' })).toThrow(/3 caractères/);
  });

  it("refuse une zone dont la géométrie n'est pas un Polygon GeoJSON", () => {
    const zones = [{ name: 'Scène', geometry: { type: 'Point', coordinates: [2.35, 48.85] } }];
    expect(() => new EventEntity({ ...valid, zones })).toThrow(/Polygon/);
  });

  it('accepte une zone Polygon correctement formée', () => {
    const zones = [
      {
        name: 'Scène Principale',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [2.35, 48.85],
              [2.36, 48.85],
              [2.36, 48.86],
              [2.35, 48.85],
            ],
          ],
        },
      },
    ];
    expect(new EventEntity({ ...valid, zones }).zones).toHaveLength(1);
  });
});
