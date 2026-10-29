const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/alerts
 * Get alerts with optional filters: severity, status, device, date range.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { severity, status, device, from, to, limit = 100, page = 1 } = req.query;
    const filter = {};

    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (device) filter.device_id = device;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Alert.countDocuments(filter);
    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Count by severity
    const counts = await Alert.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const severityCounts = { INFO: 0, WARNING: 0, CRITICAL: 0 };
    counts.forEach(c => { severityCounts[c._id] = c.count; });

    res.json({
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      severity_counts: severityCounts,
      alerts
    });
  } catch (err) {
    console.error('[GET /alerts] Error:', err.message);
    res.status(500).json({ error: 'Server error fetching alerts' });
  }
});

/**
 * PATCH /api/alerts/:id
 * Acknowledge or resolve an alert.
 */
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; // action: 'acknowledge' or 'resolve'

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (action === 'acknowledge') {
      if (alert.status !== 'active') {
        return res.status(400).json({ error: 'Alert is not active' });
      }
      alert.status = 'acknowledged';
      alert.acknowledged_by = req.user.username;
      alert.acknowledged_at = new Date();
    } else if (action === 'resolve') {
      if (alert.status === 'resolved') {
        return res.status(400).json({ error: 'Alert already resolved' });
      }
      alert.status = 'resolved';
      alert.resolved_by = req.user.username;
      alert.resolved_at = new Date();
      if (note) alert.resolution_note = note;
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "acknowledge" or "resolve"' });
    }

    await alert.save();

    // Emit update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('alertUpdate', alert.toObject());
    }

    res.json(alert);
  } catch (err) {
    console.error('[PATCH /alerts/:id] Error:', err.message);
    res.status(500).json({ error: 'Server error updating alert' });
  }
});

/**
 * GET /api/alerts/summary
 * Get a summary of alert counts by severity and status.
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const summary = await Alert.aggregate([
      {
        $group: {
          _id: { severity: '$severity', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const activeCount = await Alert.countDocuments({ status: 'active' });
    const totalToday = await Alert.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    res.json({ summary, active_count: activeCount, total_today: totalToday });
  } catch (err) {
    console.error('[GET /alerts/summary] Error:', err.message);
    res.status(500).json({ error: 'Server error fetching alert summary' });
  }
});

module.exports = router;
