const userRepository = require('../repositories/UserRepository');
const UserEntity = require('../entities/User.entity');
const bcrypt = require('bcryptjs');
const ApiError = require('../utils/ApiError');

/**
 * UserService — Gestion administrative des comptes (lister, consulter, modifier,
 * désactiver). Distinct d'AuthService, qui lui gère exclusivement les préoccupations
 * d'authentification (login/refresh/logout). Cette séparation évite qu'un seul
 * fichier ne mélange deux responsabilités différentes ("single responsibility").
 */
class UserService {
  constructor(repository) {
    this.repository = repository;
  }

  /** Liste paginée des comptes, avec filtre optionnel par rôle. */
  async list({ role, page, limit } = {}) {
    const filter = role ? { role } : {};
    const result = await this.repository.findAll(filter, { page, limit });
    return { ...result, items: result.items.map((u) => this._sanitize(u)) };
  }

  async getById(userId) {
    const user = await this.repository.findById(userId);
    if (!user) throw ApiError.notFound('Utilisateur introuvable.');
    return this._sanitize(user);
  }

  /**
   * Mise à jour partielle par un administrateur : rôle, secteur assigné, nom complet,
   * et éventuellement le mot de passe (rehaché si fourni). On revalide l'ENSEMBLE via
   * UserEntity pour ne jamais laisser passer un état incohérent (ex: rôle invalide).
   */
  async update(userId, patch) {
    const existing = await this.repository.findById(userId);
    if (!existing) throw ApiError.notFound('Utilisateur introuvable.');

    let passwordHash = existing.passwordHash;
    if (patch.password) {
      passwordHash = await bcrypt.hash(patch.password, 12);
    }

    const merged = new UserEntity({
      email: patch.email ?? existing.email,
      passwordHash,
      fullName: patch.fullName ?? existing.fullName,
      role: patch.role ?? existing.role,
      assignedZone: patch.assignedZone ?? existing.assignedZone,
    });

    const updated = await this.repository.updateById(userId, {
      email: merged.email,
      passwordHash: merged.passwordHash,
      fullName: merged.fullName,
      role: merged.role,
      assignedZone: merged.assignedZone,
    });
    return this._sanitize(updated);
  }

  /**
   * Active/désactive un compte, en un geste réversible : on ne fait JAMAIS de
   * suppression physique (perte d'historique/audit sur les items scannés par
   * cet utilisateur), on bascule simplement `isActive`. AuthService.login
   * refuse toute connexion tant que `isActive` est faux. On invalide aussi la
   * session en cours (refreshTokenHash) pour qu'une désactivation coupe
   * immédiatement l'accès, même si l'agent a déjà un token en poche.
   */
  async setActive(userId, isActive) {
    const existing = await this.repository.findById(userId);
    if (!existing) throw ApiError.notFound('Utilisateur introuvable.');

    const updated = await this.repository.updateById(userId, {
      isActive,
      ...(isActive ? {} : { refreshTokenHash: null }),
    });
    return this._sanitize(updated);
  }

  _sanitize(user) {
    const { passwordHash, refreshTokenHash, ...safe } = user.toObject ? user.toObject() : user;
    return safe;
  }
}

module.exports = new UserService(userRepository);
