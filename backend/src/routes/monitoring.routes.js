const { Router } = require('express');
const monitoringController = require('../controllers/MonitoringController');
const authMiddleware = require('../middlewares/authMiddleware');

// mergeParams: true est OBLIGATOIRE ici, car ce routeur est monté sous
// /events/:eventId/monitoring (voir routes/index.js).
const router = Router({ mergeParams: true });

router.use(authMiddleware.authenticate, authMiddleware.requireRole('admin', 'logistics_manager'));

// Ressource: /api/v1/events/:eventId/monitoring
router.get('/stock', monitoringController.stockKPI);
router.get('/carbon', monitoringController.carbonFootprint);
router.get('/carbon/history', monitoringController.carbonHistory);
router.get('/bottlenecks', monitoringController.bottlenecks);

module.exports = router;
