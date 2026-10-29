const express = require('express');
const router = express.Router();
const Threshold = require('../models/Threshold');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/thresholds
 * Get current threshold configuration.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    let thresholds = await Threshold.findOne().lean();
    if (!thresholds) {
      // Create default thresholds
      const defaults = new Threshold();
      await defaults.save();
      thresholds = defaults.toObject();
    }
    res.json(thresholds);
  } catch (err) {
    console.error('[GET /thresholds] Error:', err.message);
    res.status(500).json({ error: 'Server error fetching thresholds' });
  }
});

/**
 * PUT /api/thresholds
 * Update threshold configuration.
 * Auth: Admin only
 */
router.put('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;

    // Validate weights sum to ~1.0
    if (updates.weight_turbidity !== undefined ||
        updates.weight_temperature !== undefined ||
        updates.weight_soil_moisture !== undefined ||
        updates.weight_sound !== undefined) {
      const wt = updates.weight_turbidity ?? 0.40;
      const wte = updates.weight_temperature ?? 0.25;
      const ws = updates.weight_soil_moisture ?? 0.20;
      const wso = updates.weight_sound ?? 0.15;
      const sum = wt + wte + ws + wso;
      if (Math.abs(sum - 1.0) > 0.01) {
        return res.status(400).json({
          error: `Weights must sum to 1.0 (current sum: ${sum.toFixed(3)})`
        });
      }
    }

    let thresholds = await Threshold.findOne();
    if (!thresholds) {
      thresholds = new Threshold(updates);
    } else {
      Object.assign(thresholds, updates);
    }

    await thresholds.save();
    
    const io = req.app.get('io');
    if (io) {
      io.emit('thresholdsUpdate', thresholds.toObject());
    }

    res.json(thresholds);
  } catch (err) {
    console.error('[PUT /thresholds] Error:', err.message);
    res.status(500).json({ error: 'Server error updating thresholds' });
  }
});

module.exports = router;
