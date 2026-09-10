const BaseRepository = require('./BaseRepository');
const User = require('../models/schemas/user.schema');

/**
 * UserRepository — Couche exclusive d'accès à la collection MongoDB "users".
 * Hérite de BaseRepository pour le CRUD générique (create/find/updateById/deleteById)
 * et n'ajoute ici que les requêtes spécifiques au métier utilisateur.
 */
class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return this.model.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  /** Liste des utilisateurs, avec filtre optionnel par rôle (utilisé par l'admin). */
  async findAll(filter = {}, options = {}) {
    return this.find(filter, options);
  }
}

module.exports = new UserRepository();
