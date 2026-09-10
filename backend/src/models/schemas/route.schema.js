const { Schema, model } = require('mongoose');

const stopSchema = new Schema(
  {
    itemIds: [{ type: Schema.Types.ObjectId, ref: 'Item' }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    plannedAt: Date,
    validatedAt: Date,
    validatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true },
);

const routeSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    transporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stops: { type: [stopSchema], default: [] },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'validated'],
      default: 'planned',
      index: true,
    },
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);

routeSchema.index({ eventId: 1, status: 1 });

module.exports = model('Route', routeSchema);
