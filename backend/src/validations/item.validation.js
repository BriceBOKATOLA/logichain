const Joi = require('joi');

const geoPoint = Joi.object({
  type: Joi.string().valid('Point').required(),
  coordinates: Joi.array().items(Joi.number()).length(2).required(),
});

module.exports = {
  create: Joi.object({
    label: Joi.string().required(),
    qrCode: Joi.string().required(),
    // Optionnel : l'eventId de l'URL (/events/:eventId/items) fait autorité et
    // remplace toujours cette valeur côté controller. On la valide seulement
    // si le client la fournit, pour ne pas casser les clients qui l'envoient encore.
    eventId: Joi.string().hex().length(24).optional(),
    carbonWeightKg: Joi.number().min(0).optional(),
    transportMode: Joi.string().valid('road', 'rail', 'electric_vehicle', 'foot').optional(),
  }),
  scan: Joi.object({
    expectedVersion: Joi.number().integer().min(0).required(),
    toState: Joi.string()
      .valid('in_stock', 'in_transit', 'delivered', 'in_maintenance', 'anomaly')
      .required(),
    location: geoPoint.optional(),
    note: Joi.string().allow('').optional(),
    occurredAt: Joi.date().iso().optional(),
  }),
  syncBatch: Joi.object({
    actions: Joi.array()
      .items(
        Joi.object({
          clientActionId: Joi.string().required(),
          itemId: Joi.string().hex().length(24).required(),
          expectedVersion: Joi.number().integer().min(0).required(),
          toState: Joi.string()
            .valid('in_stock', 'in_transit', 'delivered', 'in_maintenance', 'anomaly')
            .required(),
          location: geoPoint.optional(),
          note: Joi.string().allow('').optional(),
          occurredAt: Joi.date().iso().required(),
        }),
      )
      .min(1)
      .required(),
  }),
  update: Joi.object({
    expectedVersion: Joi.number().integer().min(0).required(),
    label: Joi.string().optional(),
    carbonWeightKg: Joi.number().min(0).optional(),
    transportMode: Joi.string().valid('road', 'rail', 'electric_vehicle', 'foot').optional(),
  }).or('label', 'carbonWeightKg', 'transportMode'),
};
