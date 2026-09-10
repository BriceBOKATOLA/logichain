const Joi = require('joi');

module.exports = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(3).required(),
    role: Joi.string().valid('admin', 'logistics_manager', 'field_agent', 'transporter').required(),
    assignedZone: Joi.string().optional().allow(null),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  refresh: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};
