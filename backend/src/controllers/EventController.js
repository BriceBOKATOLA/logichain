const eventService = require('../services/EventService');
const ApiResponse = require('../utils/ApiResponse');

/**
 * EventController — Point d'entrée HTTP pour la configuration des événements
 * et de leurs zones géographiques. Comme tous les controllers : aucune règle
 * métier ici, uniquement du mapping requête HTTP -> Service -> réponse HTTP.
 */
class EventController {
  /** POST /events — Crée un nouvel événement (admin / logistics_manager). */
  create = async (req, res, next) => {
    try {
      const event = await eventService.createEvent(req.body);
      return new ApiResponse(201, event, 'Événement créé.').send(res);
    } catch (err) {
      next(err);
    }
  };

  /** GET /events — Liste paginée, filtrable par statut (?status=active). */
  list = async (req, res, next) => {
    try {
      const result = await eventService.list(req.query);
      return new ApiResponse(200, result.items, 'OK', {
        total: result.total,
        page: result.page,
        pages: result.pages,
      }).send(res);
    } catch (err) {
      next(err);
    }
  };

  /** GET /events/:id — Détail d'un événement. */
  getById = async (req, res, next) => {
    try {
      const event = await eventService.getById(req.params.id);
      return new ApiResponse(200, event).send(res);
    } catch (err) {
      next(err);
    }
  };

  /** PATCH /events/:id — Mise à jour partielle (nom, dates, statut). */
  update = async (req, res, next) => {
    try {
      const event = await eventService.updateEvent(req.params.id, req.body);
      return new ApiResponse(200, event, 'Événement mis à jour.').send(res);
    } catch (err) {
      next(err);
    }
  };

  /** DELETE /events/:id — Suppression (refusée si du matériel y est encore rattaché). */
  delete = async (req, res, next) => {
    try {
      await eventService.deleteEvent(req.params.id);
      return new ApiResponse(200, null, 'Événement supprimé.').send(res);
    } catch (err) {
      next(err);
    }
  };

  /** POST /events/:id/zones — Ajoute une zone géographique (GeoJSON Polygon) à l'événement. */
  addZone = async (req, res, next) => {
    try {
      const event = await eventService.addZone(req.params.id, req.body);
      return new ApiResponse(200, event, 'Zone ajoutée.').send(res);
    } catch (err) {
      next(err);
    }
  };

  /** GET /events/active — Événement actif le plus pertinent (branchement automatique du mobile). */
  getActiveEvent = async (req, res, next) => {
    try {
      const event = await eventService.getActiveEvent();
      return new ApiResponse(200, event).send(res);
    } catch (err) {
      next(err);
    }
  };

  /** GET /events/:id/agent-zone?lng=&lat= — Zone contenant la position GPS d'un agent. */
  locateAgentZone = async (req, res, next) => {
    try {
      const { lng, lat } = req.query;
      const zone = await eventService.locateAgentZone(req.params.id, [Number(lng), Number(lat)]);
      return new ApiResponse(200, zone).send(res);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new EventController();
