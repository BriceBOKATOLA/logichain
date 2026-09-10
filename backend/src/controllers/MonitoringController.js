const itemRepository = require('../repositories/ItemRepository');
const carbonService = require('../services/CarbonService');
const ApiResponse = require('../utils/ApiResponse');

/**
 * MonitoringController — Expose le tableau de bord d'agrégation pour les
 * administrateurs (KPI stocks, carbone, goulots d'étranglement). Ressources
 * en lecture seule : aucune méthode de création/modification ici, la donnée
 * est calculée à la volée à partir des Items et des métriques Time Series.
 */
class MonitoringController {
  /** GET /events/:eventId/monitoring/stock — Répartition des items par état. */
  stockKPI = async (req, res, next) => {
    try {
      const kpi = await itemRepository.getStockKPI(req.params.eventId);
      return new ApiResponse(200, kpi).send(res);
    } catch (err) { next(err); }
  };

  /** GET /events/:eventId/monitoring/carbon — Empreinte carbone consolidée en temps réel. */
  carbonFootprint = async (req, res, next) => {
    try {
      const footprint = await carbonService.computeConsolidatedFootprint(req.params.eventId);
      return new ApiResponse(200, footprint).send(res);
    } catch (err) { next(err); }
  };

  /** GET /events/:eventId/monitoring/carbon/history — Série temporelle (collection Time Series). */
  carbonHistory = async (req, res, next) => {
    try {
      const history = await carbonService.getHistory(req.params.eventId, Number(req.query.sinceMinutes) || 120);
      return new ApiResponse(200, history).send(res);
    } catch (err) { next(err); }
  };

  /** GET /events/:eventId/monitoring/bottlenecks — Items bloqués au-delà d'un seuil (goulots d'étranglement). */
  bottlenecks = async (req, res, next) => {
    try {
      const items = await itemRepository.detectBottlenecks(req.params.eventId, Number(req.query.thresholdMinutes) || 60);
      return new ApiResponse(200, items).send(res);
    } catch (err) { next(err); }
  };
}

module.exports = new MonitoringController();
