const authService = require('../services/AuthService');
const ApiResponse = require('../utils/ApiResponse');

/**
 * AuthController - Reçoit les requêtes HTTP, délègue au Service, retourne la réponse.
 * Ne contient AUCUNE logique métier (juste du mapping req -> service -> res).
 */
class AuthController {
  /** POST /auth/register — Création d'un compte (email, mot de passe, rôle). */
  register = async (req, res, next) => {
    try {
      const user = await authService.register(req.body);
      return new ApiResponse(201, user, 'Compte créé avec succès.').send(res);
    } catch (err) {
      next(err);
    }
  };

  /** POST /auth/login — Authentifie et délivre un couple de tokens JWT (access + refresh). */
  login = async (req, res, next) => {
    try {
      const result = await authService.login(req.body);
      return new ApiResponse(200, result, 'Connexion réussie.').send(res);
    } catch (err) {
      next(err);
    }
  };

  /** POST /auth/refresh — Échange un refresh token valide contre un nouveau couple de tokens. */
  refresh = async (req, res, next) => {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      return new ApiResponse(200, tokens, 'Token rafraîchi.').send(res);
    } catch (err) {
      next(err);
    }
  };

  /** POST /auth/logout — Invalide la session courante (efface le refresh token stocké). */
  logout = async (req, res, next) => {
    try {
      await authService.logout(req.user.sub);
      return new ApiResponse(200, null, 'Déconnexion réussie.').send(res);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new AuthController();
