const Joi = require('joi');

/**
 * Schémas de validation pour la gestion administrative des utilisateurs.
 * Tous les champs sont optionnels (mise à jour partielle), mais au moins un
 * champ doit être fourni (.min(1)) pour éviter une requête PATCH vide inutile.
 */
module.exports = {
  update: Joi.object({
    email: Joi.string().email().optional(),
    password: Joi.string().min(8).optional(),
    fullName: Joi.string().min(3).optional(),
    role: Joi.string().valid('admin', 'logistics_manager', 'field_agent', 'transporter').optional(),
    assignedZone: Joi.string().allow(null).optional(),
  }).min(1),

  setStatus: Joi.object({
    isActive: Joi.boolean().required(),
  }),
};
