const ApiError = require('../utils/ApiError');

/**
 * ValidationMiddleware - Valide req.body/query/params contre un schéma Joi.
 * Garantit "la validation systématique de l'intégrité des données à l'entrée".
 */
class ValidationMiddleware {
  validate(schema, property = 'body') {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
      if (error) {
        return next(ApiError.unprocessable('Données invalides.', error.details.map((d) => d.message)));
      }
      req[property] = value;
      next();
    };
  }
}

module.exports = new ValidationMiddleware();
