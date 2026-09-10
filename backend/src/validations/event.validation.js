const Joi = require('joi');

const geoPolygon = Joi.object({
  type: Joi.string().valid('Polygon').required(),
  coordinates: Joi.array()
    .items(Joi.array().items(Joi.array().items(Joi.number()).length(2)))
    .required(),
});

module.exports = {
  create: Joi.object({
    name: Joi.string().min(3).required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    status: Joi.string().valid('draft', 'active', 'closed').optional(),
    zones: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          geometry: geoPolygon.required(),
        }),
      )
      .optional(),
  }),
  addZone: Joi.object({
    name: Joi.string().required(),
    geometry: geoPolygon.required(),
  }),
  update: Joi.object({
    name: Joi.string().min(3).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    status: Joi.string().valid('draft', 'active', 'closed').optional(),
  }).min(1),
  locate: Joi.object({
    lng: Joi.number().min(-180).max(180).required(),
    lat: Joi.number().min(-90).max(90).required(),
  }),
};
