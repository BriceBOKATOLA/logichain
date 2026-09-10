const routeRepository = require('../repositories/RouteRepository');
const RouteEntity = require('../entities/Route.entity');
const db = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * RouteService - Supervision des feuilles de route et des transferts de responsabilité.
 * Le transfert de responsabilité doit être atomique (transaction ACID) car il touche
 * potentiellement plusieurs documents (Route + Items associés).
 */
class RouteService {
  constructor(repository) {
    this.repository = repository;
  }

  async createRoute(dto) {
    const entity = new RouteEntity(dto);
    return this.repository.create({ ...entity });
  }

  async validateStop(routeId, stopId, userId) {
    return db.withTransaction(async (session) => {
      const route = await this.repository.validateStop(routeId, stopId, userId, session);
      if (!route) throw ApiError.notFound('Arrêt ou feuille de route introuvable.');

      const allValidated = route.stops.every((s) => !!s.validatedAt);
      if (allValidated && route.status !== 'validated') {
        route.status = 'validated';
        await route.save({ session });
      }
      return route;
    });
  }

  async getByTransporter(transporterId, eventId) {
    return this.repository.findByTransporter(transporterId, eventId);
  }

  /** Vue de supervision admin : toutes les feuilles de route de l'événement. */
  async getByEvent(eventId) {
    return this.repository.findByEvent(eventId);
  }

  async getById(routeId) {
    const route = await this.repository.findById(routeId);
    if (!route) throw ApiError.notFound('Feuille de route introuvable.');
    return route;
  }

  /**
   * Mise à jour d'une feuille de route (arrêts, transporteur) AVANT son exécution.
   * Bloquée dès que le moindre arrêt a été validé sur le terrain : modifier une
   * feuille de route déjà partiellement exécutée corromprait la traçabilité
   * (quels arrêts un agent a-t-il réellement suivis ?).
   */
  async updateRoute(routeId, patch) {
    const existing = await this.repository.findById(routeId);
    if (!existing) throw ApiError.notFound('Feuille de route introuvable.');

    const hasValidatedStops = existing.stops.some((s) => !!s.validatedAt);
    if (hasValidatedStops) {
      throw ApiError.conflict(
        'Cette feuille de route a déjà des arrêts validés sur le terrain : elle ne peut plus être modifiée, seulement consultée.',
      );
    }

    const merged = new RouteEntity({ ...existing.toObject(), ...patch });
    return this.repository.updateById(routeId, {
      transporterId: merged.transporterId,
      stops: merged.stops,
      status: merged.status,
    });
  }

  /**
   * Suppression d'une feuille de route, avec la même garde que updateRoute :
   * on ne supprime jamais une feuille de route dont l'exécution a déjà commencé
   * (perte de traçabilité sur ce qui a été livré et par qui).
   */
  async deleteRoute(routeId) {
    const existing = await this.repository.findById(routeId);
    if (!existing) throw ApiError.notFound('Feuille de route introuvable.');

    const hasValidatedStops = existing.stops.some((s) => !!s.validatedAt);
    if (hasValidatedStops) {
      throw ApiError.conflict('Impossible de supprimer une feuille de route dont l\'exécution a déjà commencé.');
    }

    await this.repository.deleteById(routeId);
  }
}

module.exports = new RouteService(routeRepository);
