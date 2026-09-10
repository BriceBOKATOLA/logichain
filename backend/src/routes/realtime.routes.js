const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const sseManager = require('../realtime/SSEManager');

const router = Router();

/**
 * Endpoint SSE de secours pour les clients ne supportant pas les WebSockets.
 * GET /api/v1/realtime/stream/:eventId
 */
router.get('/stream/:eventId', authMiddleware.authenticate, (req, res) => {
  sseManager.registerClient(`event:${req.params.eventId}`, res);
});

module.exports = router;
