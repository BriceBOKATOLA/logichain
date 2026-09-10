const { Router } = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const eventRoutes = require('./event.routes');
const itemRoutes = require('./item.routes');
const routeRoutes = require('./route.routes');
const monitoringRoutes = require('./monitoring.routes');
const realtimeRoutes = require('./realtime.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/events/:eventId/items', itemRoutes);
router.use('/events/:eventId/monitoring', monitoringRoutes);
router.use('/routes', routeRoutes);
router.use('/realtime', realtimeRoutes);

module.exports = router;
