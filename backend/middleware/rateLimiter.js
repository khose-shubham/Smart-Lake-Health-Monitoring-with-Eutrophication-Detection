const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 500,                     // 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Device posting rate limit (more lenient — 10s interval per device)
const deviceLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 12,                      // 12 posts per minute (every 5s)
  keyGenerator: (req) => req.body.device_id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Device sending too fast' }
});

// Auth route rate limit (strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, try again later' }
});

module.exports = { apiLimiter, deviceLimiter, authLimiter };
