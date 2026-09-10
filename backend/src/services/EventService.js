const eventRepository = require('../repositories/EventRepository');
const itemRepository = require('../repositories/ItemRepository');
const EventEntity = require('../entities/Event.entity');
const ApiError = require('../utils/ApiError');

/**
 * EventService - Configuration des événements et découpage cartographique des zones.
 */
class EventService {
  constructor(repository) {
    this.repository = repository;
  }

  async createEvent(dto) {
    const entity = new EventEntity(dto); // valide les règles métier avant toute écriture
    return this.repository.create({ ...entity });
  }

  async addZone(eventId, zoneDto) {
    const event = await this.repository.findById(eventId);
    if (!event) throw ApiError.notFound('Événement introuvable.');

    const merged = new EventEntity({
      ...event.toObject(),
      zones: [...event.zones, zoneDto],
    });

    return this.repository.updateById(eventId, { zones: merged.zones });
  }

  async getById(id) {
    const event = await this.repository.findById(id);
    if (!event) throw ApiError.notFound('Événement introuvable.');
    return event;
  }

  /**
   * Mise à jour partielle. On fusionne avec le document existant puis on
   * revalide l'ENSEMBLE via EventEntity (et pas seulement les champs fournis),
   * pour ne jamais laisser passer un état incohérent (ex: nouvelle startDate
   * postérieure à une endDate non modifiée).
   */
  async updateEvent(eventId, patch) {
    const existing = await this.repository.findById(eventId);
    if (!existing) throw ApiError.notFound('Événement introuvable.');

    const merged = new EventEntity({ ...existing.toObject(), ...patch });
    return this.repository.updateById(eventId, {
      name: merged.name,
      startDate: merged.startDate,
      endDate: merged.endDate,
      status: merged.status,
    });
  }

  async list(query = {}) {
    const { page, limit, sort, status, ...rest } = query;
    const filter = { ...rest };
    if (status) filter.status = status;
    return this.repository.find(filter, { page, limit, sort });
  }

  /**
   * Retourne l'événement actif le plus pertinent pour le mobile (le plus récemment démarré).
   * Utilisé par le front pour se brancher automatiquement sans identifiant en dur.
   */
  async getActiveEvent() {
    const events = await this.repository.findActiveEvents();
    if (!events.length) throw ApiError.notFound('Aucun événement actif pour le moment.');
    return events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
  }

  /**
   * Suppression d'un événement. Protégée par une vérification d'intégrité
   * référentielle : impossible de supprimer un événement tant que du matériel
   * (Item) y est encore rattaché, pour ne jamais laisser d'items orphelins
   * pointant vers un eventId inexistant. L'admin doit d'abord vider/archiver
   * le matériel, ce qui est une garde-fou volontaire plutôt qu'une contrainte technique.
   */
  async deleteEvent(eventId) {
    const existing = await this.repository.findById(eventId);
    if (!existing) throw ApiError.notFound('Événement introuvable.');

    const itemCount = await itemRepository.countByEvent(eventId);
    if (itemCount > 0) {
      throw ApiError.conflict(
        `Impossible de supprimer cet événement : ${itemCount} item(s) y sont encore rattaché(s). Supprimez ou migrez d'abord le matériel.`,
      );
    }

    await this.repository.deleteById(eventId);
  }

  /**
   * Détermine la zone d'un agent à partir de sa position GPS (utilisé par le mobile).
   */
  async locateAgentZone(eventId, coordinates) {
    return this.repository.findZoneContainingPoint(eventId, coordinates);
  }
}

module.exports = new EventService(eventRepository);
