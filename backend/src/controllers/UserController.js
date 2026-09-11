const userService = require('../services/UserService');
const ApiResponse = require('../utils/ApiResponse');

/**
 * UserController — Point d'entrée HTTP pour la gestion administrative des
 * comptes (distinct d'AuthController, qui gère l'authentification elle-même).
 * Toutes ces routes sont réservées au rôle admin (voir user.routes.js).
 */
class UserController {
  /** GET /users — Liste paginée des comptes, filtrable par rôle. */
  list = async (req, res, next) => {
    try {
      const result = await userService.list(req.query);
      return new ApiResponse(200, result.items, 'OK', {
        total: result.total,
        page: result.page,
        pages: result.pages,
      }).send(res);
    } catch (err) {
      next(err);
    }
  };

  /** GET /users/:id — Détail d'un compte. */
  getById = async (req, res, next) => {
    try {
      const user = await userService.getById(req.params.id);
      return new ApiResponse(200, user).send(res);
    } catch (err) {
      next(err);
    }
  };

  /** PATCH /users/:id — Modifie rôle, secteur assigné, nom ou mot de passe. */
  update = async (req, res, next) => {
    try {
      const user = await userService.update(req.params.id, req.body);
      return new ApiResponse(200, user, 'Utilisateur mis à jour.').send(res);
    } catch (err) {
      next(err);
    }
  };

  /** PATCH /users/:id/status — Active ou désactive le compte, en un geste réversible. */
  setStatus = async (req, res, next) => {
    try {
      const user = await userService.setActive(req.params.id, req.body.isActive);
      const message = req.body.isActive ? 'Utilisateur réactivé.' : 'Utilisateur désactivé.';
      return new ApiResponse(200, user, message).send(res);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new UserController();
