/**
 * Erreur métier standardisée de l'API.
 * Toute erreur volontaire levée par les Services/Controllers doit être une instance de cette classe,
 * afin que le ErrorMiddleware puisse construire une réponse HTTP cohérente.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - Code HTTP (400, 401, 404, 409, 422...)
   * @param {string} message - Message destiné au client
   * @param {object} [details] - Détails additionnels (ex: erreurs de validation)
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Non authentifié') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Accès refusé') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Ressource introuvable') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflit de version (verrouillage optimiste)') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Entité non traitable', details) {
    return new ApiError(422, message, details);
  }

  static internal(message = 'Erreur interne du serveur') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
