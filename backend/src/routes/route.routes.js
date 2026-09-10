const { Router } = require('express');
const routeController = require('../controllers/RouteController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validations/route.validation');

const router = Router();

router.use(authMiddleware.authenticate);

// Ressource : /api/v1/routes
router.post(
  '/',
  authMiddleware.requireRole('admin', 'logistics_manager'),
  validate.validate(schemas.create),
  routeController.create,
); // Create
router.get('/', authMiddleware.requireRole('admin', 'logistics_manager'), routeController.getByEvent); // Read (supervision admin, tous transporteurs)
router.get('/transporter/:transporterId', routeController.getByTransporter); // Read (vue par transporteur)
router.get('/:id', routeController.getById); // Read (détail)
router.patch(
  '/:id',
  authMiddleware.requireRole('admin', 'logistics_manager'),
  validate.validate(schemas.update),
  routeController.update,
); // Update (avant exécution)
router.delete('/:id', authMiddleware.requireRole('admin', 'logistics_manager'), routeController.delete); // Delete (avant exécution)
router.patch('/:id/stops/:stopId/validate', routeController.validateStop); // Update dérivé (validation d'un arrêt, transaction ACID)

module.exports = router;
