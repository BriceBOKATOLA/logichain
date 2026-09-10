const { Schema, model } = require('mongoose');

/**
 * Sous-document d'historisation (nested document dénormalisé) : chaque changement d'état
 * de l'item est journalisé directement dans le document parent pour une lecture rapide
 * et un audit complet sans jointure.
 */
const historyEntrySchema = new Schema(
  {
    fromState: String,
    toState: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    offline: { type: Boolean, default: false }, // vrai si l'action a été capturée hors-ligne puis synchronisée
    note: String,
  },
  { _id: false },
);

const itemSchema = new Schema(
  {
    label: { type: String, required: true },
    qrCode: { type: String, required: true, unique: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    state: {
      type: String,
      enum: ['in_stock', 'in_transit', 'delivered', 'in_maintenance', 'anomaly'],
      default: 'in_stock',
      index: true,
    },
    carbonWeightKg: { type: Number, default: 0 }, // poids utilisé pour le calcul d'empreinte carbone
    transportMode: { type: String, enum: ['road', 'rail', 'electric_vehicle', 'foot'], default: 'road' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    history: { type: [historyEntrySchema], default: [] },
    // Verrouillage optimiste : incrémenté à chaque mise à jour, vérifié par le Repository.
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);

itemSchema.index({ location: '2dsphere' });
itemSchema.index({ eventId: 1, state: 1 }); // index composé pour le dashboard KPI

module.exports = model('Item', itemSchema);
