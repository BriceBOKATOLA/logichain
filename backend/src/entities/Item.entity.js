const BaseEntity = require('./BaseEntity');

const VALID_STATES = ['in_stock', 'in_transit', 'delivered', 'in_maintenance', 'anomaly'];
const VALID_TRANSPORT_MODES = ['road', 'rail', 'electric_vehicle', 'foot'];

/**
 * Entité métier "Item" (matériel tracé). Encapsule la machine à états du cycle de vie
 * du matériel ainsi que les règles de transition (polymorphisme via canTransitionTo,
 * potentiellement spécialisé par des sous-types de matériel).
 */
class ItemEntity extends BaseEntity {
  constructor({
    label,
    qrCode,
    eventId,
    state = 'in_stock',
    location = null,
    version = 0,
    carbonWeightKg = 0,
    transportMode = 'road',
  }) {
    super();
    this.label = label;
    this.qrCode = qrCode;
    this.eventId = eventId;
    this.state = state;
    this.location = location; // GeoJSON Point
    this.version = version; // utilisé pour le verrouillage optimiste
    this.carbonWeightKg = carbonWeightKg; // utilisé par CarbonService pour l'empreinte carbone
    this.transportMode = transportMode;
    this.validate();
  }

  validate() {
    this.assert(!!this.label, "Le libellé de l'item est obligatoire.");
    this.assert(!!this.qrCode, 'Le code QR/Barcode est obligatoire.');
    this.assert(!!this.eventId, "L'item doit être rattaché à un événement.");
    this.assert(VALID_STATES.includes(this.state), `État d'item invalide: ${this.state}`);
    this.assert(
      VALID_TRANSPORT_MODES.includes(this.transportMode),
      `Mode de transport invalide: ${this.transportMode}`,
    );
    this.assert(
      typeof this.carbonWeightKg === 'number' && this.carbonWeightKg >= 0,
      'Le poids carbone doit être un nombre positif.',
    );
    if (this.location) {
      this.assert(
        this.location.type === 'Point' && Array.isArray(this.location.coordinates),
        'La localisation doit être un Point GeoJSON.',
      );
    }
  }

  /**
   * Règle métier de transition d'état (surchargeable par des sous-classes d'items spécialisés).
   */
  canTransitionTo(nextState) {
    const allowed = {
      in_stock: ['in_transit'],
      in_transit: ['delivered', 'anomaly'],
      delivered: ['in_maintenance', 'anomaly'],
      in_maintenance: ['in_stock', 'anomaly'],
      anomaly: ['in_maintenance', 'in_stock'],
    };
    return (allowed[this.state] || []).includes(nextState);
  }
}

ItemEntity.STATES = VALID_STATES;
module.exports = ItemEntity;
