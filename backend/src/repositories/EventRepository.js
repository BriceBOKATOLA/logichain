const BaseRepository = require('./BaseRepository');
const Event = require('../models/schemas/event.schema');

class EventRepository extends BaseRepository {
  constructor() {
    super(Event);
  }

  async findActiveEvents() {
    return this.model.find({ status: 'active' }).exec();
  }

  /**
   * Recherche la zone contenant un point donné (agent géolocalisé) via $geoIntersects.
   */
  async findZoneContainingPoint(eventId, [lng, lat]) {
    const result = await this.model
      .findOne(
        {
          _id: eventId,
          'zones.geometry': {
            $geoIntersects: { $geometry: { type: 'Point', coordinates: [lng, lat] } },
          },
        },
        { 'zones.$': 1 },
      )
      .exec();
    return result?.zones?.[0] || null;
  }
}

module.exports = new EventRepository();
