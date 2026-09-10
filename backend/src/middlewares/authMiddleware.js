const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * AuthMiddleware - Vérifie le JWT et injecte l'utilisateur courant dans req.user.
 * Expose aussi requireRole() pour le contrôle d'accès basé sur les rôles (RBAC).
 */
class AuthMiddleware {
  authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(ApiError.unauthorized('Token manquant.'));

    try {
      req.user = jwt.verify(token, env.jwt.accessSecret);
      next();
    } catch {
      next(ApiError.unauthorized('Token invalide ou expiré.'));
    }
  }

  requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return next(ApiError.forbidden("Vous n'avez pas les droits requis pour cette action."));
      }
      next();
    };
  }
}

module.exports = new AuthMiddleware();
