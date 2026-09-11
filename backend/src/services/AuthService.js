const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userRepository = require('../repositories/UserRepository');
const UserEntity = require('../entities/User.entity');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * AuthService - Logique métier d'authentification. Totalement indépendant du protocole
 * HTTP : il ne connaît ni req ni res, seulement des DTOs simples.
 */
class AuthService {
  constructor(repository) {
    this.userRepository = repository;
  }

  async register({ email, password, fullName, role, assignedZone }) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw ApiError.conflict('Un compte existe déjà avec cet email.');

    const passwordHash = await bcrypt.hash(password, 12);
    const entity = new UserEntity({ email, passwordHash, fullName, role, assignedZone });
    const user = await this.userRepository.create({ ...entity });
    return this._sanitize(user);
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw ApiError.unauthorized('Identifiants invalides.');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Identifiants invalides.');

    // Compte désactivé par un administrateur (UserService.setActive) : les
    // identifiants restent valides (on ne les révoque pas), mais la session
    // ne doit jamais être émise tant que le compte n'est pas réactivé.
    if (user.isActive === false) throw ApiError.forbidden('Ce compte a été désactivé.');

    const tokens = this._issueTokens(user);
    user.refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await user.save();

    return { user: this._sanitize(user), ...tokens };
  }

  async refresh(refreshToken) {
    let payload;
    try {
      payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
    } catch {
      throw ApiError.unauthorized('Refresh token invalide ou expiré.');
    }

    const user = await this.userRepository.findById(payload.sub);
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (!user || user.refreshTokenHash !== hash) {
      throw ApiError.unauthorized('Session invalide, veuillez vous reconnecter.');
    }

    const tokens = this._issueTokens(user);
    user.refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await user.save();
    return tokens;
  }

  async logout(userId) {
    await this.userRepository.updateById(userId, { refreshTokenHash: null });
  }

  _issueTokens(user) {
    const payload = { sub: user._id.toString(), role: user.role };
    const accessToken = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpires });
    const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });
    return { accessToken, refreshToken };
  }

  _sanitize(user) {
    const { passwordHash, refreshTokenHash, ...safe } = user.toObject ? user.toObject() : user;
    return safe;
  }
}

module.exports = new AuthService(userRepository);
