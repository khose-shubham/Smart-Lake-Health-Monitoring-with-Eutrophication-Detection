const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authenticate JWT token from Authorization header.
 * Attaches req.user = { id, username, role }
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user._id,
      username: user.username,
      role: user.role
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Require admin role.
 * Must be used after authenticate middleware.
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Authenticate device API key from x-api-key header.
 * Used for ESP32 → backend communication.
 */
const authenticateDevice = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['x-device-key'];
  if (!apiKey || apiKey !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

/**
 * Allow either JWT or device API key authentication.
 */
const authenticateAny = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['x-device-key'];
  if (apiKey && apiKey === process.env.DEVICE_API_KEY) {
    req.isDevice = true;
    return next();
  }
  return authenticate(req, res, next);
};

module.exports = { authenticate, requireAdmin, authenticateDevice, authenticateAny };
