const itemRepository = require('../repositories/ItemRepository');
const monitoringRepository = require('../repositories/MonitoringRepository');

/**
 * CarbonService - Isole tout le calcul métier de l'empreinte carbone,
 * conformément à l'exigence "Découpage architectural strict" (calculs = Service, jamais Controller).
 */
class CarbonService {
  constructor(itemRepo, monitoringRepo) {
    this.itemRepository = itemRepo;
    this.monitoringRepository = monitoringRepo;
    // Facteurs d'émission (kg CO2e / kg transporté), simplifiés pour la démonstration.
    this.emissionFactors = {
      road: 0.12,
      rail: 0.03,
      electric_vehicle: 0.02,
      foot: 0,
    };
  }

  async computeConsolidatedFootprint(eventId) {
    const [result] = await this.itemRepository.getCarbonAggregation(eventId, this.emissionFactors);
    const totalCarbonKg = result?.totalCarbonKg || 0;

    await this.monitoringRepository.recordMetric(eventId, 'carbon', totalCarbonKg);
    return { eventId, totalCarbonKg: Math.round(totalCarbonKg * 100) / 100 };
  }

  async getHistory(eventId, sinceMinutes = 120) {
    return this.monitoringRepository.getRecentSeries(eventId, 'carbon', sinceMinutes);
  }
}

module.exports = new CarbonService(itemRepository, monitoringRepository);
