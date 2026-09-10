const BaseRepository = require('./BaseRepository');
const Monitoring = require('../models/schemas/monitoring.schema');

class MonitoringRepository extends BaseRepository {
  constructor() {
    super(Monitoring);
  }

  async recordMetric(eventId, metricType, value, metadata = {}) {
    return this.create({ eventId, metricType, value, metadata, timestamp: new Date() });
  }

  async getRecentSeries(eventId, metricType, sinceMinutes = 30) {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return this.model.find({ eventId, metricType, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .exec();
  }
}

module.exports = new MonitoringRepository();
