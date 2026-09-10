const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Le Service est un singleton câblé sur le Repository au moment du `require` :
// on substitue le module Repository AVANT de charger le Service, ce qui permet
// de tester la logique métier sans la moindre I/O MongoDB.
jest.mock('../../src/repositories/UserRepository', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
}));

const userRepository = require('../../src/repositories/UserRepository');
const authService = require('../../src/services/AuthService');
const env = require('../../src/config/env');

const OBJECT_ID = '665f1a2b3c4d5e6f70820001';

function fakeUserDoc(overrides = {}) {
  return {
    _id: { toString: () => OBJECT_ID },
    email: 'agent@logichain.io',
    fullName: 'Agent Terrain',
    role: 'field_agent',
    passwordHash: overrides.passwordHash ?? bcrypt.hashSync('Agent1234!', 4),
    refreshTokenHash: null,
    save: jest.fn().mockResolvedValue(true),
    toObject() {
      const { save, toObject, ...rest } = this;
      return rest;
    },
    ...overrides,
  };
}

describe('AuthService.register', () => {
  it('hache le mot de passe et ne renvoie jamais le hash au client', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockImplementation(async (data) => ({
      ...data,
      _id: { toString: () => OBJECT_ID },
    }));

    const result = await authService.register({
      email: 'agent@logichain.io',
      password: 'Agent1234!',
      fullName: 'Agent Terrain',
      role: 'field_agent',
    });

    const persisted = userRepository.create.mock.calls[0][0];
    expect(persisted.passwordHash).not.toBe('Agent1234!');
    expect(await bcrypt.compare('Agent1234!', persisted.passwordHash)).toBe(true);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('refreshTokenHash');
    expect(result.email).toBe('agent@logichain.io');
  });

  it('refuse un email déjà utilisé avec un conflit 409', async () => {
    userRepository.findByEmail.mockResolvedValue(fakeUserDoc());

    await expect(
      authService.register({
        email: 'agent@logichain.io',
        password: 'Agent1234!',
        fullName: 'Agent Terrain',
        role: 'field_agent',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("propage l'erreur 422 de l'entité si le rôle est invalide", async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      authService.register({
        email: 'agent@logichain.io',
        password: 'Agent1234!',
        fullName: 'Agent Terrain',
        role: 'root',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('AuthService.login', () => {
  it('délivre un couple de tokens signés et stocke le hash du refresh token', async () => {
    const user = fakeUserDoc();
    userRepository.findByEmail.mockResolvedValue(user);

    const result = await authService.login({ email: user.email, password: 'Agent1234!' });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).not.toHaveProperty('passwordHash');

    const payload = jwt.verify(result.accessToken, env.jwt.accessSecret);
    expect(payload).toMatchObject({ sub: OBJECT_ID, role: 'field_agent' });

    // Le refresh token n'est JAMAIS stocké en clair : seule son empreinte SHA-256 l'est.
    expect(user.refreshTokenHash).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(user.refreshTokenHash).not.toBe(result.refreshToken);
    expect(user.save).toHaveBeenCalled();
  });

  it('renvoie le même 401 générique pour un email inconnu et un mot de passe faux', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    const unknownEmail = await authService
      .login({ email: 'inconnu@logichain.io', password: 'Agent1234!' })
      .catch((e) => e);

    userRepository.findByEmail.mockResolvedValue(fakeUserDoc());
    const wrongPassword = await authService
      .login({ email: 'agent@logichain.io', password: 'MauvaisMotDePasse!' })
      .catch((e) => e);

    // Messages identiques : on n'indique pas à un attaquant quel compte existe.
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });
});

describe('AuthService.refresh', () => {
  it('échange un refresh token valide contre un nouveau couple de tokens', async () => {
    const user = fakeUserDoc();
    userRepository.findByEmail.mockResolvedValue(user);
    const { refreshToken } = await authService.login({ email: user.email, password: 'Agent1234!' });

    userRepository.findById.mockResolvedValue(user);
    const tokens = await authService.refresh(refreshToken);

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
  });

  it('rejette un refresh token signé avec une autre clé', async () => {
    const forged = jwt.sign({ sub: OBJECT_ID, role: 'admin' }, 'cle-attaquant-0123456789', {
      expiresIn: '7d',
    });

    await expect(authService.refresh(forged)).rejects.toMatchObject({ statusCode: 401 });
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('rejette un token valide dont le hash ne correspond plus (session révoquée)', async () => {
    const user = fakeUserDoc();
    userRepository.findByEmail.mockResolvedValue(user);
    const { refreshToken } = await authService.login({ email: user.email, password: 'Agent1234!' });

    // Simule un logout concurrent : le hash stocké a été effacé côté base.
    userRepository.findById.mockResolvedValue({ ...user, refreshTokenHash: null });

    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('AuthService.logout', () => {
  it('efface le refresh token stocké pour invalider la session', async () => {
    userRepository.updateById.mockResolvedValue({});

    await authService.logout(OBJECT_ID);

    expect(userRepository.updateById).toHaveBeenCalledWith(OBJECT_ID, { refreshTokenHash: null });
  });
});
