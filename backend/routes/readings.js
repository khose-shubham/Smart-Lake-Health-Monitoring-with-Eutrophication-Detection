const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Reading = require('../models/Reading');
const Device = require('../models/Device');
const { analyzeReading } = require('../services/riskEngine');
const { generateAlerts } = require('../services/alertService');
const { authenticateDevice, authenticate } = require('../middleware/auth');
const { deviceLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/readings
 * Receive sensor data from ESP32 device.
 * Auth: Device API key
 */
router.post('/',
  deviceLimiter,
  authenticateDevice,
  [
    body('device_id').isString().trim().notEmpty(),
    body('temperature').isNumeric(),
    body('humidity').isNumeric(),
    body('turbidity_ntu').isNumeric(),
    body('sound_level').isNumeric(),
    body('soil_moisture_pct').isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const data = req.body;

      // Run risk engine analysis
      const analysis = await analyzeReading(data);

      // Create and save reading with enriched data
      const reading = new Reading({
        device_id: data.device_id,
        timestamp: data.timestamp || new Date(),
        temperature: data.temperature,
        humidity: data.humidity,
        turbidity_raw: data.turbidity_raw || 0,
        turbidity_ntu: data.turbidity_ntu,
        sound_raw: data.sound_raw || 0,
        sound_level: data.sound_level,
        soil_moisture_raw: data.soil_moisture_raw || 0,
        soil_moisture_pct: data.soil_moisture_pct,
        relay_state: data.relay_state || false,
        risk_score: analysis.risk_score,
        oxygen_stress_index: analysis.oxygen_stress_index,
        cascade_stage: analysis.cascade_stage,
        cascade_label: analysis.cascade_label,
        risk_level: analysis.risk_level,
        turbidity_trend_1h: analysis.turbidity_trend_1h,
        turbidity_trend_6h: analysis.turbidity_trend_6h,
        rapid_rise_flag: analysis.rapid_rise_flag
      });

      await reading.save();

      // Update device last_seen
      await Device.findOneAndUpdate(
        { device_id: data.device_id },
        {
          device_id: data.device_id,
          last_seen: new Date(),
          online: true,
          relay_state: data.relay_state
        },
        { upsert: true, new: true }
      );

      // Generate alerts
      const io = req.app.get('io');
      const alerts = await generateAlerts(data, analysis, io);

      // Emit live reading via Socket.IO
      if (io) {
        io.emit('reading', reading.toObject());
      }

      res.status(201).json({
        success: true,
        reading: reading.toObject(),
        alerts: alerts.length,
        risk_score: analysis.risk_score,
        cascade_stage: analysis.cascade_stage,
        cascade_label: analysis.cascade_label
      });
    } catch (err) {
      console.error('[POST /readings] Error:', err.message);
      res.status(500).json({ error: 'Server error processing reading' });
    }
  }
);

/**
 * GET /api/readings
 * Query readings with optional filters.
 * Auth: JWT
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { from, to, device, limit = 500, page = 1 } = req.query;
    const filter = {};

    if (device) filter.device_id = device;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Reading.countDocuments(filter);
    const readings = await Reading.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      readings
    });
  } catch (err) {
    console.error('[GET /readings] Error:', err.message);
    res.status(500).json({ error: 'Server error fetching readings' });
  }
});

/**
 * GET /api/readings/latest
 * Get the most recent reading per device (or for a specific device).
 */
router.get('/latest', authenticate, async (req, res) => {
  try {
    const { device } = req.query;

    if (device) {
      const latest = await Reading.findOne({ device_id: device })
        .sort({ timestamp: -1 })
        .lean();
      return res.json(latest || {});
    }

    // Get latest for all devices
    const devices = await Device.find().lean();
    const latestReadings = {};

    for (const dev of devices) {
      const reading = await Reading.findOne({ device_id: dev.device_id })
        .sort({ timestamp: -1 })
        .lean();
      if (reading) {
        latestReadings[dev.device_id] = {
          ...reading,
          device_name: dev.name,
          online: dev.online,
          relay_mode: dev.relay_mode
        };
      }
    }

    res.json(latestReadings);
  } catch (err) {
    console.error('[GET /readings/latest] Error:', err.message);
    res.status(500).json({ error: 'Server error fetching latest readings' });
  }
});

/**
 * GET /api/readings/stats
 * Get min/max/avg summary for a date range.
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { from, to, device } = req.query;
    const match = {};

    if (device) match.device_id = device;
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }

    const stats = await Reading.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avg_temp: { $avg: '$temperature' },
          min_temp: { $min: '$temperature' },
          max_temp: { $max: '$temperature' },
          avg_humidity: { $avg: '$humidity' },
          avg_turbidity: { $avg: '$turbidity_ntu' },
          min_turbidity: { $min: '$turbidity_ntu' },
          max_turbidity: { $max: '$turbidity_ntu' },
          avg_sound: { $avg: '$sound_level' },
          min_sound: { $min: '$sound_level' },
          max_sound: { $max: '$sound_level' },
          avg_soil: { $avg: '$soil_moisture_pct' },
          min_soil: { $min: '$soil_moisture_pct' },
          max_soil: { $max: '$soil_moisture_pct' },
          avg_risk: { $avg: '$risk_score' },
          max_risk: { $max: '$risk_score' },
          avg_osi: { $avg: '$oxygen_stress_index' }
        }
      }
    ]);

    res.json(stats[0] || {});
  } catch (err) {
    console.error('[GET /readings/stats] Error:', err.message);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

module.exports = router;
