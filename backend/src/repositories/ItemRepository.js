const mongoose = require('mongoose');
const BaseRepository = require('./BaseRepository');
const Item = require('../models/schemas/item.schema');

class ItemRepository extends BaseRepository {
  constructor() {
    super(Item);
  }

  /**
   * IMPORTANT : contrairement à find()/findOne(), les pipelines d'agrégation
   * MongoDB ($match) NE CASTENT PAS automatiquement les chaînes en ObjectId.
   * Toute méthode d'agrégation filtrant par eventId DOIT passer par ce helper,
   * sous peine de $match silencieusement vide (aucune erreur levée, juste 0 résultat).
   */
  _toObjectId(id) {
    return id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id));
  }

  async findByQrCode(qrCode) {
    return this.model.findOne({ qrCode }).exec();
  }

  /** Nombre d'items rattachés à un événement — utilisé pour l'intégrité référentielle. */
  async countByEvent(eventId) {
    return this.model.countDocuments({ eventId }).exec();
  }

  async findNearby(eventId, [lng, lat], maxDistanceMeters = 500) {
    return this.model.find({
      eventId,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceMeters,
        },
      },
    }).exec();
  }

  /**
   * Ajoute une entrée d'historique ET applique la transition d'état de façon atomique,
   * en respectant le verrouillage optimiste (version).
   */
  async transitionState(id, expectedVersion, historyEntry, extraFields = {}, session = null) {
    return this.updateWithOptimisticLock(
      id,
      expectedVersion,
      {
        $set: { state: historyEntry.toState, ...extraFields },
        $push: { history: historyEntry },
      },
      session,
    );
  }

  /**
   * Pipeline d'agrégation : état des stocks par état, pour le tableau de bord admin.
   */
  async getStockKPI(eventId) {
    return this.aggregate([
      { $match: { eventId: this._toObjectId(eventId) } },
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $project: { _id: 0, state: '$_id', count: 1 } },
    ]);
  }

  /**
   * Empreinte carbone consolidée : somme(poids * facteur d'émission par mode de transport).
   */
  async getCarbonAggregation(eventId, emissionFactors) {
    const branches = Object.entries(emissionFactors).map(([mode, factor]) => ({
      case: { $eq: ['$transportMode', mode] },
      then: { $multiply: ['$carbonWeightKg', factor] },
    }));

    return this.aggregate([
      { $match: { eventId: this._toObjectId(eventId) } },
      { $project: { emission: { $switch: { branches, default: 0 } } } },
      { $group: { _id: null, totalCarbonKg: { $sum: '$emission' } } },
    ]);
  }

  /**
   * Détection de goulots d'étranglement : items bloqués trop longtemps dans un même état.
   */
  async detectBottlenecks(eventId, thresholdMinutes = 60) {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    return this.model.find({
      eventId,
      state: { $in: ['in_transit', 'anomaly'] },
      updatedAt: { $lte: threshold },
    }).select('label qrCode state updatedAt').exec();
  }
}

module.exports = new ItemRepository();
