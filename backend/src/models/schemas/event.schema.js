const { Schema, model } = require('mongoose');

/**
 * Schéma MongoDB "Event". Les zones sont stockées en GeoJSON pour permettre
 * des requêtes géospatiales ($geoWithin, $near) lors de l'affectation d'agents.
 */
const zoneSchema = new Schema({
  name: { type: String, required: true },
  geometry: {
    type: { type: String, enum: ['Polygon'], required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
}, { _id: true });

const eventSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 3 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft', index: true },
  zones: { type: [zoneSchema], default: [] },
}, { timestamps: true });

eventSchema.index({ 'zones.geometry': '2dsphere' });
eventSchema.index({ status: 1, startDate: 1 });

module.exports = model('Event', eventSchema);
