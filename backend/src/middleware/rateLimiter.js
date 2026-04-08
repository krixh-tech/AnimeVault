const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

exports.generalLimiter = createLimiter(15 * 60 * 1000, 300, 'Too many requests');
exports.authLimiter = createLimiter(15 * 60 * 1000, 10, 'Too many auth attempts');
exports.downloadLimiter = createLimiter(60 * 1000, 5, 'Too many download requests');
exports.searchLimiter = createLimiter(60 * 1000, 30, 'Too many search requests');
exports.detectLimiter = createLimiter(60 * 1000, 10, 'Too many URL detection requests');
