const BaseEntity = require('./BaseEntity');

/**
 * Entité "Feuille de route" d'un transporteur/prestataire.
 */
class RouteEntity extends BaseEntity {
  constructor({ eventId, transporterId, stops = [], status = 'planned' }) {
    super();
    this.eventId = eventId;
    this.transporterId = transporterId;
    this.stops = stops; // [{ itemIds, location, plannedAt, validatedAt }]
    this.status = status; // planned | in_progress | completed | validated
    this.validate();
  }

  validate() {
    this.assert(!!this.eventId, "La feuille de route doit être rattachée à un événement.");
    this.assert(!!this.transporterId, 'Un transporteur doit être assigné.');
    this.assert(Array.isArray(this.stops) && this.stops.length > 0, 'La feuille de route doit contenir au moins un arrêt.');
    this.assert(['planned', 'in_progress', 'completed', 'validated'].includes(this.status), 'Statut de route invalide.');
  }
}

module.exports = RouteEntity;
