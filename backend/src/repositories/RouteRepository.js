const BaseRepository = require('./BaseRepository');
const Route = require('../models/schemas/route.schema');

class RouteRepository extends BaseRepository {
  constructor() {
    super(Route);
  }

  async findByTransporter(transporterId, eventId) {
    return this.model.find({ transporterId, eventId }).exec();
  }

  /**
   * Toutes les feuilles de route d'un événement, tous transporteurs confondus.
   * Nécessaire à la supervision admin (cahier des charges : "Supervision des
   * transferts de responsabilité et validation des feuilles de route des
   * transporteurs" — une vue par transporteur seule ne permet pas la supervision globale).
   */
  async findByEvent(eventId) {
    return this.model.find({ eventId }).populate('transporterId', 'fullName email').exec();
  }

  async validateStop(routeId, stopId, userId, session = null) {
    return this.model
      .findOneAndUpdate(
        { _id: routeId, 'stops._id': stopId },
        {
          $set: {
            'stops.$.validatedAt': new Date(),
            'stops.$.validatedBy': userId,
          },
          $inc: { version: 1 },
        },
        { new: true, session },
      )
      .exec();
  }
}

module.exports = new RouteRepository();
