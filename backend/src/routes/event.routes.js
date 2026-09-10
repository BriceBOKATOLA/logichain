const { Router } = require('express');
const eventController = require('../controllers/EventController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validations/event.validation');

const router = Router();

router.use(authMiddleware.authenticate);

// Ressource : /api/v1/events
router.post('/', authMiddleware.requireRole('admin', 'logistics_manager'), validate.validate(schemas.create), eventController.create); // Create
router.get('/', eventController.list); // Read (liste)
router.get('/active', eventController.getActiveEvent); // Read (branchement auto du mobile)
router.get('/:id', eventController.getById); // Read (détail)
router.patch('/:id', authMiddleware.requireRole('admin', 'logistics_manager'), validate.validate(schemas.update), eventController.update); // Update
router.delete('/:id', authMiddleware.requireRole('admin'), eventController.delete); // Delete
router.post('/:id/zones', authMiddleware.requireRole('admin', 'logistics_manager'), validate.validate(schemas.addZone), eventController.addZone); // Sous-ressource : ajout de zone
router.get('/:id/agent-zone', validate.validate(schemas.locate, 'query'), eventController.locateAgentZone); // Lecture dérivée (géolocalisation)

module.exports = router;
