const Joi = require('joi');

const stopSchema = Joi.object({
  itemIds: Joi.array().items(Joi.string().hex().length(24)).required(),
  location: Joi.object({
    type: Joi.string().valid('Point').required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
  }).required(),
  plannedAt: Joi.date().iso().required(),
});

module.exports = {
  create: Joi.object({
    eventId: Joi.string().hex().length(24).required(),
    transporterId: Joi.string().hex().length(24).required(),
    stops: Joi.array().items(stopSchema).min(1).required(),
  }),
  // eventId volontairement absent : on ne permet jamais de déplacer une feuille
  // de route existante vers un autre événement via une mise à jour partielle.
  update: Joi.object({
    transporterId: Joi.string().hex().length(24).optional(),
    stops: Joi.array().items(stopSchema).min(1).optional(),
    status: Joi.string().valid('planned', 'in_progress', 'completed', 'validated').optional(),
  }).min(1),
};
