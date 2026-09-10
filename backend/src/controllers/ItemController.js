const itemService = require('../services/ItemService');
const syncService = require('../services/SyncService');
const ApiResponse = require('../utils/ApiResponse');

/**
 * ItemController — Point d'entrée HTTP pour tout ce qui touche au matériel tracé
 * (Item). Chaque méthode ne fait que : (1) extraire les données de la requête,
 * (2) appeler le Service correspondant, (3) formater la réponse HTTP. Aucune
 * règle métier, aucun accès à la base de données ne doit apparaître ici — c'est
 * le rôle exclusif d'ItemService et ItemRepository.
 */
class ItemController {
  /** POST /events/:eventId/items — Crée un nouvel item rattaché à l'événement de l'URL. */
  create = async (req, res, next) => {
    try {
      // L'URL (/events/:eventId/items) fait autorité : on force l'eventId du body
      // pour éviter toute incohérence entre la ressource parente et la charge utile.
      const item = await itemService.createItem({ ...req.body, eventId: req.params.eventId });
      return new ApiResponse(201, item, 'Item créé.').send(res);
    } catch (err) { next(err); }
  };

  /** GET /events/:eventId/items — Liste paginée, avec filtre delta-sync optionnel (updatedSince). */
  list = async (req, res, next) => {
    try {
      const result = await itemService.list(req.params.eventId, req.query);
      return new ApiResponse(200, result.items, 'OK', { total: result.total, page: result.page, pages: result.pages }).send(res);
    } catch (err) { next(err); }
  };

  /** GET /events/:eventId/items/qr/:qrCode — Résolution d'un item scanné par son QR code. */
  getByQrCode = async (req, res, next) => {
    try {
      const item = await itemService.findByQrCode(req.params.qrCode);
      return new ApiResponse(200, item).send(res);
    } catch (err) { next(err); }
  };

  /** GET /events/:eventId/items/:id — Récupération par identifiant Mongo. */
  getById = async (req, res, next) => {
    try {
      const item = await itemService.getById(req.params.id);
      return new ApiResponse(200, item).send(res);
    } catch (err) { next(err); }
  };

  /** PATCH /events/:eventId/items/:id/scan — Transition d'état après un scan terrain. */
  scan = async (req, res, next) => {
    try {
      const updated = await itemService.scanTransition({
        itemId: req.params.id,
        userId: req.user.sub,
        ...req.body,
      });
      return new ApiResponse(200, updated, 'Transition appliquée.').send(res);
    } catch (err) { next(err); }
  };

  /** PATCH /events/:eventId/items/:id/anomaly — Déclaration d'anomalie géolocalisée. */
  declareAnomaly = async (req, res, next) => {
    try {
      const updated = await itemService.declareAnomaly({
        itemId: req.params.id,
        userId: req.user.sub,
        ...req.body,
      });
      return new ApiResponse(200, updated, 'Anomalie déclarée.').send(res);
    } catch (err) { next(err); }
  };

  /** PATCH /events/:eventId/items/:id — Édition administrative des métadonnées (pas de l'état). */
  update = async (req, res, next) => {
    try {
      const { expectedVersion, ...patch } = req.body;
      const updated = await itemService.updateMetadata(req.params.id, expectedVersion, patch);
      return new ApiResponse(200, updated, 'Item mis à jour.').send(res);
    } catch (err) { next(err); }
  };

  /** DELETE /events/:eventId/items/:id — Suppression définitive (erreurs de saisie). */
  delete = async (req, res, next) => {
    try {
      await itemService.deleteItem(req.params.id);
      return new ApiResponse(200, null, 'Item supprimé.').send(res);
    } catch (err) { next(err); }
  };

  /** POST /events/:eventId/items/sync — Réconciliation d'un lot d'actions hors-ligne. */
  syncBatch = async (req, res, next) => {
    try {
      const result = await syncService.processBatch(req.params.eventId, req.body.actions, req.user.sub);
      return new ApiResponse(200, result, 'Synchronisation traitée.').send(res);
    } catch (err) { next(err); }
  };
}

module.exports = new ItemController();
