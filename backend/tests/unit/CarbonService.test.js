jest.mock('../../src/repositories/ItemRepository', () => ({
  getCarbonAggregation: jest.fn(),
}));
jest.mock('../../src/repositories/MonitoringRepository', () => ({
  recordMetric: jest.fn().mockResolvedValue({}),
  getRecentSeries: jest.fn().mockResolvedValue([]),
}));

const itemRepository = require('../../src/repositories/ItemRepository');
const monitoringRepository = require('../../src/repositories/MonitoringRepository');
const carbonService = require('../../src/services/CarbonService');

const EVENT_ID = '665f1a2b3c4d5e6f70810001';

describe('CarbonService.computeConsolidatedFootprint', () => {
  it('arrondit au centième et historise la métrique dans la série temporelle', async () => {
    itemRepository.getCarbonAggregation.mockResolvedValue([{ totalCarbonKg: 123.4567 }]);

    const result = await carbonService.computeConsolidatedFootprint(EVENT_ID);

    expect(result).toEqual({ eventId: EVENT_ID, totalCarbonKg: 123.46 });
    expect(monitoringRepository.recordMetric).toHaveBeenCalledWith(EVENT_ID, 'carbon', 123.4567);
  });

  it('retourne 0 lorsque aucun item n’est rattaché à l’événement', async () => {
    itemRepository.getCarbonAggregation.mockResolvedValue([]);

    const result = await carbonService.computeConsolidatedFootprint(EVENT_ID);

    expect(result.totalCarbonKg).toBe(0);
    expect(monitoringRepository.recordMetric).toHaveBeenCalledWith(EVENT_ID, 'carbon', 0);
  });

  it('transmet au Repository les facteurs d’émission par mode de transport', async () => {
    itemRepository.getCarbonAggregation.mockResolvedValue([{ totalCarbonKg: 0 }]);

    await carbonService.computeConsolidatedFootprint(EVENT_ID);

    const factors = itemRepository.getCarbonAggregation.mock.calls[0][1];
    expect(factors).toEqual({ road: 0.12, rail: 0.03, electric_vehicle: 0.02, foot: 0 });
    // Cohérence métier : la route doit rester le mode le plus émetteur, la marche le moins.
    expect(factors.road).toBeGreaterThan(factors.rail);
    expect(factors.rail).toBeGreaterThan(factors.electric_vehicle);
    expect(factors.foot).toBe(0);
  });
});

describe('CarbonService.getHistory', () => {
  it('interroge la série temporelle sur la fenêtre par défaut de 120 minutes', async () => {
    await carbonService.getHistory(EVENT_ID);
    expect(monitoringRepository.getRecentSeries).toHaveBeenCalledWith(EVENT_ID, 'carbon', 120);
  });

  it('respecte une fenêtre personnalisée', async () => {
    await carbonService.getHistory(EVENT_ID, 15);
    expect(monitoringRepository.getRecentSeries).toHaveBeenCalledWith(EVENT_ID, 'carbon', 15);
  });
});
