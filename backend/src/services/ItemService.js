const itemRepository = require('../repositories/ItemRepository');
const eventRepository = require('../repositories/EventRepository');
const ItemEntity = require('../entities/Item.entity');
const notificationService = require('./NotificationService');
const monitoringRepository = require('../repositories/MonitoringRepository');
const ApiError = require('../utils/ApiError');

/**
 * ItemService - Cœur métier du scan et du suivi de matériel.
 * Gère : la validation des transitions d'état, le mode déconnecté (rejeu d'actions horodatées),
 * et le verrouillage optimiste en cas de synchronisation concurrente.
 */
class ItemService {
  constructor(repository) {
    this.repository = repository;
  }

  async createItem(dto) {
    const entity = new ItemEntity(dto);
    return this.repository.create({ ...entity });
  }

  async scanTransition({
    itemId,
    expectedVersion,
    toState,
    userId,
    location,
    offline = false,
    occurredAt,
    note,
  }) {
    const current = await this.repository.findById(itemId);
    if (!current) throw ApiError.notFound('Item introuvable.');

    const entity = new ItemEntity(current.toObject());
    if (!entity.canTransitionTo(toState)) {
      throw ApiError.unprocessable(`Transition invalide: ${entity.state} -> ${toState}`);
    }

    const historyEntry = {
      fromState: entity.state,
      toState,
      changedBy: userId,
      changedAt: occurredAt ? new Date(occurredAt) : new Date(),
      location,
      offline,
      note,
    };

    const updated = await this.repository.transitionState(itemId, expectedVersion, historyEntry, {
      location: location || current.location,
    });

    await monitoringRepository.recordMetric(current.eventId, 'scan', 1, { itemId, toState });

    if (toState === 'anomaly') {
      notificationService.notifyEvent(current.eventId, 'anomaly-declared', {
        itemId,
        label: current.label,
        location,
      });
    }

    return updated;
  }

  /**
   * Réconciliation d'un lot d'actions capturées hors-ligne par l'app mobile.
   * Chaque action porte sa propre version attendue : en cas de conflit,
   * l'action est reportée dans la liste des conflits plutôt que d'écraser les données.
   */
  async reconcileOfflineBatch(actions, userId) {
    const results = { applied: [], conflicts: [] };

    for (const action of actions) {
      try {
        const updated = await this.scanTransition({ ...action, userId, offline: true });
        results.applied.push({
          clientActionId: action.clientActionId,
          itemId: updated._id,
          version: updated.version,
        });
      } catch (err) {
        results.conflicts.push({
          clientActionId: action.clientActionId,
          itemId: action.itemId,
          reason: err.message,
        });
      }
    }
    return results;
  }

  async declareAnomaly({ itemId, expectedVersion, userId, location, note }) {
    return this.scanTransition({ itemId, expectedVersion, toState: 'anomaly', userId, location, note });
  }

  /**
   * Édition administrative des métadonnées d'un item (libellé, poids carbone,
   * mode de transport). Volontairement SÉPARÉE de scanTransition() : modifier
   * une caractéristique du matériel n'est pas la même opération métier que faire
   * progresser son cycle de vie logistique, même si les deux passent par le
   * même verrouillage optimiste (version) pour éviter d'écraser un scan concurrent.
   */
  async updateMetadata(itemId, expectedVersion, patch) {
    const current = await this.repository.findById(itemId);
    if (!current) throw ApiError.notFound('Item introuvable.');

    // Fusion + revalidation complète via l'entité, comme pour Event/User :
    // on ne valide jamais seulement les champs fournis, mais l'état final entier.
    const merged = new ItemEntity({ ...current.toObject(), ...patch });

    return this.repository.updateWithOptimisticLock(itemId, expectedVersion, {
      $set: {
        label: merged.label,
        carbonWeightKg: merged.carbonWeightKg,
        transportMode: merged.transportMode,
      },
    });
  }

  /**
   * Suppression définitive d'un item. Contrairement à un changement d'état,
   * ceci retire l'enregistrement (et son historique) de la base — réservé aux
   * cas d'erreur de saisie (ex: doublon créé par erreur), pas à un usage courant.
   */
  async deleteItem(itemId) {
    const deleted = await this.repository.deleteById(itemId);
    if (!deleted) throw ApiError.notFound('Item introuvable.');
  }

  async findByQrCode(qrCode) {
    const item = await this.repository.findByQrCode(qrCode);
    if (!item) throw ApiError.notFound('Aucun item ne correspond à ce code.');
    return item;
  }

  async getById(itemId) {
    const item = await this.repository.findById(itemId);
    if (!item) throw ApiError.notFound('Item introuvable.');
    return item;
  }

  /**
   * Liste des items d'un événement. Supporte un filtre `updatedSince` (delta-sync) :
   * l'app mobile peut ainsi ne redemander que les items modifiés depuis sa dernière
   * synchronisation plutôt que de retélécharger tout le référentiel à chaque fois —
   * important pour la performance sur un événement avec des milliers d'items.
   */
  /**
   * Liste le matériel d'un événement. `zone` (optionnel) scope le
   * téléchargement au secteur assigné à l'agent — exigence explicite du
   * cahier des charges sur la parcimonie réseau/batterie : un agent de
   * terrain n'a pas besoin de télécharger tout le référentiel de
   * l'événement, seulement ce qui le concerne.
   *
   * Un item encore `in_stock` (jamais déployé sur le terrain, donc à une
   * position par défaut non significative) reste TOUJOURS inclus, quelle que
   * soit la zone demandée : un agent doit pouvoir le voir pour le prendre en
   * charge et le transporter vers son secteur, ce qui serait impossible si le
   * filtre géographique l'excluait avant même qu'il n'ait de position réelle.
   */
  async list(eventId, { updatedSince, zone, ...pagination } = {}) {
    const filter = { eventId };
    if (updatedSince) {
      filter.updatedAt = { $gte: new Date(updatedSince) };
    }

    if (zone) {
      const zoneDoc = await eventRepository.findZoneByName(eventId, zone);
      // Nom de secteur inconnu (zone renommée/supprimée depuis) : on ignore le
      // filtre plutôt que de renvoyer une liste vide qui bloquerait l'agent.
      if (zoneDoc) {
        filter.$or = [{ state: 'in_stock' }, { location: { $geoWithin: { $geometry: zoneDoc.geometry } } }];
      }
    }

    return this.repository.find(filter, pagination);
  }
}

module.exports = new ItemService(itemRepository);
