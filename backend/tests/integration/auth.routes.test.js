const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');
const User = require('../../src/models/schemas/user.schema');
const env = require('../../src/config/env');

const NEW_USER = {
  email: 'agent@logichain.io',
  password: 'Agent1234!',
  fullName: 'Agent Terrain',
  role: 'field_agent',
};

/** Crée un compte puis se connecte, et retourne le corps de la réponse de login. */
async function registerAndLogin(overrides = {}) {
  const payload = { ...NEW_USER, ...overrides };
  await request(app).post('/api/v1/auth/register').send(payload).expect(201);
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: payload.email, password: payload.password })
    .expect(200);
  return res.body.data;
}

describe('POST /api/v1/auth/register', () => {
  it('crée le compte et renvoie 201 sans jamais exposer le hash du mot de passe', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(NEW_USER);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('agent@logichain.io');
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data).not.toHaveProperty('refreshTokenHash');

    const stored = await User.findOne({ email: 'agent@logichain.io' });
    expect(stored.passwordHash).not.toBe(NEW_USER.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // empreinte bcrypt
  });

  it('rejette un mot de passe de moins de 8 caractères en 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...NEW_USER, password: 'court' });

    expect(res.status).toBe(422);
    expect(res.body.data.join(' ')).toMatch(/password/);
  });

  it('rejette un rôle hors référentiel en 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...NEW_USER, role: 'super_admin' });

    expect(res.status).toBe(422);
  });

  it('rejette un email déjà enregistré en 409', async () => {
    await request(app).post('/api/v1/auth/register').send(NEW_USER).expect(201);
    const res = await request(app).post('/api/v1/auth/register').send(NEW_USER);

    expect(res.status).toBe(409);
    expect(await User.countDocuments()).toBe(1);
  });

  it('ignore les champs non déclarés au schéma (pas d’escalade de privilège)', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ ...NEW_USER, refreshTokenHash: 'injecte', isSuperAdmin: true })
      .expect(201);

    const stored = await User.findOne({ email: NEW_USER.email });
    expect(stored.refreshTokenHash).toBeNull();
    expect(stored.role).toBe('field_agent');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('renvoie un couple access/refresh exploitable', async () => {
    const data = await registerAndLogin();

    expect(data.accessToken).toEqual(expect.any(String));
    expect(data.refreshToken).toEqual(expect.any(String));

    const payload = jwt.verify(data.accessToken, env.jwt.accessSecret);
    expect(payload.role).toBe('field_agent');
  });

  it('renvoie 401 sur mot de passe erroné', async () => {
    await request(app).post('/api/v1/auth/register').send(NEW_USER).expect(201);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: NEW_USER.email, password: 'MauvaisMotDePasse!' });

    expect(res.status).toBe(401);
  });

  it('renvoie 401 sur compte inexistant', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'fantome@logichain.io', password: 'Agent1234!' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('échange un refresh token valide contre un nouveau couple', async () => {
    const { refreshToken } = await registerAndLogin();

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('rejette un refresh token forgé avec une autre clé', async () => {
    const forged = jwt.sign({ sub: '665f1a2b3c4d5e6f70820001', role: 'admin' }, 'cle-attaquant-123456', {
      expiresIn: '7d',
    });

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: forged });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('invalide la session : le refresh token précédent devient inutilisable', async () => {
    const { accessToken, refreshToken } = await registerAndLogin();

    await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${accessToken}`).expect(200);

    const stored = await User.findOne({ email: NEW_USER.email });
    expect(stored.refreshTokenHash).toBeNull();

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('refuse une déconnexion sans jeton d’accès', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});
