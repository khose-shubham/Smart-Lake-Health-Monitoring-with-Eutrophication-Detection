const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { authenticate, requireAdmin, authenticateDevice } = require('../middleware/auth');

/**
 * POST /api/relay
 * Set relay mode and state.
 * Auth: Admin JWT
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { device_id, mode, state } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }
    if (mode && !['auto', 'manual'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be "auto" or "manual"' });
    }

    const update = {};
    if (mode) update.relay_mode = mode;
    if (state !== undefined) update.relay_state = !!state;

    const device = await Device.findOneAndUpdate(
      { device_id },
      update,
      { new: true, upsert: true }
    );

    // Emit relay command via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('relayCommand', {
        device_id,
        mode: device.relay_mode,
        state: device.relay_state
      });
    }

    res.json({
      device_id: device.device_id,
      mode: device.relay_mode,
      state: device.relay_state
    });
  } catch (err) {
    console.error('[POST /relay] Error:', err.message);
    res.status(500).json({ error: 'Server error setting relay' });
  }
});

/**
 * GET /api/relay/status
 * Get relay mode and state for a device.
 * Auth: Device API key (called by ESP32)
 */
router.get('/status', authenticateDevice, async (req, res) => {
  try {
    const { device_id } = req.query;
    if (!device_id) {
      return res.status(400).json({ error: 'device_id query param required' });
    }

    const device = await Device.findOne({ device_id }).lean();
    if (!device) {
      return res.json({ mode: 'auto', state: false });
    }

    res.json({
      mode: device.relay_mode,
      state: device.relay_state
    });
  } catch (err) {
    console.error('[GET /relay/status] Error:', err.message);
    res.status(500).json({ error: 'Server error fetching relay status' });
  }
});

module.exports = router;
