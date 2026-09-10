const { Router } = require('express');
const authController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validations/auth.validation');

const router = Router();

router.post('/register', validate.validate(schemas.register), authController.register);
router.post('/login', validate.validate(schemas.login), authController.login);
router.post('/refresh', validate.validate(schemas.refresh), authController.refresh);
router.post('/logout', authMiddleware.authenticate, authController.logout);

module.exports = router;
