const { Router } = require('express');
const itemController = require('../controllers/ItemController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validations/item.validation');

// mergeParams: true est OBLIGATOIRE ici, car ce routeur est monté sous
// /events/:eventId/items (voir routes/index.js) : sans cette option, Express
// n'expose PAS req.params.eventId aux handlers de ce sous-routeur.
const router = Router({ mergeParams: true });

router.use(authMiddleware.authenticate);

// Ressource : /api/v1/events/:eventId/items
router.post('/', authMiddleware.requireRole('admin', 'logistics_manager'), validate.validate(schemas.create), itemController.create); // Create
router.get('/', itemController.list); // Read (liste, supporte updatedSince pour le delta-sync)
router.get('/qr/:qrCode', itemController.getByQrCode); // Read (résolution scan terrain)
router.get('/:id', itemController.getById); // Read (détail par ID Mongo)
router.patch('/:id', authMiddleware.requireRole('admin', 'logistics_manager'), validate.validate(schemas.update), itemController.update); // Update (métadonnées, pas l'état)
router.delete('/:id', authMiddleware.requireRole('admin', 'logistics_manager'), itemController.delete); // Delete
router.patch('/:id/scan', validate.validate(schemas.scan), itemController.scan); // Update (transition d'état terrain)
router.patch('/:id/anomaly', validate.validate(schemas.scan), itemController.declareAnomaly); // Update (déclaration d'anomalie)
router.post('/sync', validate.validate(schemas.syncBatch), itemController.syncBatch); // Synchronisation hors-ligne (lot d'actions)

module.exports = router;
