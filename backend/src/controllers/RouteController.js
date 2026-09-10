const routeService = require('../services/RouteService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * RouteController — Point d'entrée HTTP pour les feuilles de route des
 * transporteurs. Comme tous les controllers de l'API : aucune règle métier ici,
 * uniquement du mapping requête HTTP -> Service -> réponse HTTP.
 */
class RouteController {
  /** POST /routes — Crée une nouvelle feuille de route pour un transporteur. */
  create = async (req, res, next) => {
    try {
      const route = await routeService.createRoute(req.body);
      return new ApiResponse(201, route, 'Feuille de route créée.').send(res);
    } catch (err) { next(err); }
  };

  /** GET /routes/transporter/:transporterId?eventId=X — Feuilles de route d'un transporteur donné. */
  getByTransporter = async (req, res, next) => {
    try {
      if (!req.query.eventId) throw ApiError.badRequest('Le paramètre de requête "eventId" est obligatoire.');
      const routes = await routeService.getByTransporter(req.params.transporterId, req.query.eventId);
      return new ApiResponse(200, routes).send(res);
    } catch (err) { next(err); }
  };

  /** GET /routes?eventId=X — Supervision admin : toutes les feuilles de route d'un événement. */
  getByEvent = async (req, res, next) => {
    try {
      if (!req.query.eventId) throw ApiError.badRequest('Le paramètre de requête "eventId" est obligatoire.');
      const routes = await routeService.getByEvent(req.query.eventId);
      return new ApiResponse(200, routes).send(res);
    } catch (err) { next(err); }
  };

  /** GET /routes/:id — Détail d'une feuille de route. */
  getById = async (req, res, next) => {
    try {
      const route = await routeService.getById(req.params.id);
      return new ApiResponse(200, route).send(res);
    } catch (err) { next(err); }
  };

  /** PATCH /routes/:id — Modification avant exécution (refusée si des arrêts sont déjà validés). */
  update = async (req, res, next) => {
    try {
      const route = await routeService.updateRoute(req.params.id, req.body);
      return new ApiResponse(200, route, 'Feuille de route mise à jour.').send(res);
    } catch (err) { next(err); }
  };

  /** DELETE /routes/:id — Suppression avant exécution (même garde que update). */
  delete = async (req, res, next) => {
    try {
      await routeService.deleteRoute(req.params.id);
      return new ApiResponse(200, null, 'Feuille de route supprimée.').send(res);
    } catch (err) { next(err); }
  };

  /** PATCH /routes/:id/stops/:stopId/validate — Validation d'un arrêt (transaction ACID). */
  validateStop = async (req, res, next) => {
    try {
      const route = await routeService.validateStop(req.params.id, req.params.stopId, req.user.sub);
      return new ApiResponse(200, route, 'Arrêt validé.').send(res);
    } catch (err) { next(err); }
  };
}

module.exports = new RouteController();
