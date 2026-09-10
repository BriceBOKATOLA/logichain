const BaseEntity = require('./BaseEntity');

/**
 * Entité métier "Événement" : représente un festival/salon avec ses zones géographiques.
 * Hérite de BaseEntity (héritage justifié : mutualisation de la validation générique).
 */
class EventEntity extends BaseEntity {
  constructor({ name, startDate, endDate, zones = [], status = 'draft' }) {
    super();
    this.name = name;
    this.startDate = startDate;
    this.endDate = endDate;
    this.zones = zones; // [{ name, geometry: GeoJSON Polygon }]
    this.status = status; // draft | active | closed
    this.validate();
  }

  validate() {
    this.assert(!!this.name && this.name.trim().length >= 3, "Le nom de l'événement doit contenir au moins 3 caractères.");
    this.assert(new Date(this.startDate) < new Date(this.endDate), 'La date de début doit précéder la date de fin.');
    this.assert(['draft', 'active', 'closed'].includes(this.status), 'Statut d\'événement invalide.');
    this.zones.forEach((zone) => {
      this.assert(zone.geometry && zone.geometry.type === 'Polygon', `La zone "${zone.name}" doit avoir une géométrie GeoJSON de type Polygon.`);
    });
  }

  isActive() {
    return this.status === 'active';
  }
}

module.exports = EventEntity;
