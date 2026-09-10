const { Schema, model } = require('mongoose');

/**
 * Collection Time Series MongoDB dédiée aux métriques de monitoring temps réel
 * (scans/minute, latence, empreinte carbone instantanée...). Optimisée en écriture
 * pour absorber les pics lors des phases de montage/démontage.
 */
const monitoringSchema = new Schema(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    metricType: { type: String, enum: ['scan', 'carbon', 'bottleneck', 'sync'], required: true },
    value: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'eventId',
      granularity: 'seconds',
    },
  },
);

module.exports = model('Monitoring', monitoringSchema);
