const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/devices
 * List all registered devices.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const devices = await Device.find().sort({ updatedAt: -1 }).lean();

    // Update online status based on timeout
    const now = Date.now();
    const enriched = devices.map(d => {
      const lastSeen = d.last_seen ? new Date(d.last_seen).getTime() : 0;
      const timeout = (d.offline_timeout || 60) * 1000;
      const online = (now - lastSeen) < timeout;
      return { ...d, online };
    });

    res.json(enriched);
  } catch (err) {
    console.error('[GET /devices] Error:', err.message);
    res.status(500).json({ error: 'Server error fetching devices' });
  }
});

/**
 * PUT /api/devices/:id
 * Update device info (name, location, etc.)
 * Auth: Admin only
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, offline_timeout } = req.body;

    const update = {};
    if (name) update.name = name;
    if (location) update.location = location;
    if (offline_timeout) update.offline_timeout = offline_timeout;

    const device = await Device.findOneAndUpdate(
      { device_id: id },
      update,
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (err) {
    console.error('[PUT /devices/:id] Error:', err.message);
    res.status(500).json({ error: 'Server error updating device' });
  }
});

module.exports = router;
