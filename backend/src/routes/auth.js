// ── routes/auth.js ───────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/refresh', ctrl.refreshToken);
router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.getMe);
router.get('/verify/:token', ctrl.verifyEmail);

module.exports = router;
