const { Router } = require('express');
const userController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validations/user.validation');

const router = Router();

// Toute la gestion des comptes est réservée aux administrateurs.
router.use(authMiddleware.authenticate, authMiddleware.requireRole('admin'));

// Ressource : /api/v1/users
router.get('/', userController.list);
router.get('/:id', userController.getById);
router.patch('/:id', validate.validate(schemas.update), userController.update);
router.delete('/:id', userController.deactivate);

module.exports = router;
