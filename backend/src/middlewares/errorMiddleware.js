const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');

/**
 * ErrorMiddleware - Point unique de traduction des erreurs en réponses HTTP.
 * Convertit aussi les erreurs Mongoose usuelles (ValidationError, CastError, code 11000)
 * en codes HTTP sémantiques (400/404/409/422) conformément au niveau 2 de Richardson.
 */
// La signature à 4 arguments est ce qui identifie un gestionnaire d'erreurs
// auprès d'Express : `next` doit être déclaré même s'il n'est pas utilisé.
function errorMiddleware(err, req, res, next) {
  let apiError = err;

  if (!(err instanceof ApiError)) {
    if (err.name === 'ValidationError') {
      apiError = ApiError.unprocessable('Erreur de validation des données.', err.errors);
    } else if (err.name === 'CastError') {
      apiError = ApiError.badRequest(`Identifiant invalide: ${err.value}`);
    } else if (err.code === 11000) {
      apiError = ApiError.conflict('Une ressource avec cette valeur unique existe déjà.');
    } else {
      logger.error(err.message, { stack: err.stack });
      apiError = ApiError.internal();
    }
  }

  return new ApiResponse(apiError.statusCode, apiError.details, apiError.message).send(res);
}

module.exports = errorMiddleware;
