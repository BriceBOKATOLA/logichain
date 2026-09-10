const ApiError = require('../utils/ApiError');

/**
 * BaseRepository - Couche EXCLUSIVE d'accès à MongoDB (via Mongoose).
 * Aucune autre couche de l'application n'est autorisée à importer un modèle Mongoose
 * directement : tout passe par un Repository qui hérite de cette classe.
 */
class BaseRepository {
  /**
   * @param {import('mongoose').Model} model - Le modèle Mongoose encapsulé.
   */
  constructor(model) {
    if (this.constructor === BaseRepository) {
      throw new Error('BaseRepository est abstraite.');
    }
    this.model = model;
  }

  async create(data, session = null) {
    const [doc] = await this.model.create([data], { session });
    return doc;
  }

  async findById(id) {
    return this.model.findById(id).exec();
  }

  async findOne(filter) {
    return this.model.findOne(filter).exec();
  }

  async find(filter = {}, options = {}) {
    // page/limit arrivent souvent en string (query params HTTP) : on les caste
    // explicitement pour éviter que le driver MongoDB ne rejette un type inattendu.
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(options.limit, 10) || 50));
    const sort = options.sort || { createdAt: -1 };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateById(id, update, session = null) {
    return this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true, session }).exec();
  }

  async deleteById(id, session = null) {
    return this.model.findByIdAndDelete(id, { session }).exec();
  }

  /**
   * Mise à jour avec verrouillage optimiste : la modification n'est appliquée
   * QUE SI la version fournie correspond encore à la version en base.
   * Si aucun document ne correspond, on lève un ApiError 409 (conflit).
   */
  async updateWithOptimisticLock(id, expectedVersion, update, session = null) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, version: expectedVersion },
      { ...update, $inc: { version: 1 } },
      { new: true, runValidators: true, session },
    ).exec();

    if (!doc) {
      const current = await this.model.findById(id).exec();
      if (!current) throw ApiError.notFound('Ressource introuvable.');
      throw ApiError.conflict(
        `Conflit de version : la ressource a été modifiée entre-temps (version actuelle: ${current.version}).`,
      );
    }
    return doc;
  }

  /**
   * Point d'entrée pour les pipelines d'agrégation (KPI, carbone, goulots d'étranglement).
   * Isolé ici afin qu'aucun Service n'ait à connaître la syntaxe MongoDB.
   */
  async aggregate(pipeline) {
    return this.model.aggregate(pipeline).exec();
  }
}

module.exports = BaseRepository;
