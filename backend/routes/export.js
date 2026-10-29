const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const Reading = require('../models/Reading');
const Alert = require('../models/Alert');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/export/csv
 * Export readings as CSV for a date range.
 */
router.get('/csv', authenticate, async (req, res) => {
  try {
    const { from, to, device } = req.query;
    const filter = {};

    if (device) filter.device_id = device;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const readings = await Reading.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    if (readings.length === 0) {
      return res.status(404).json({ error: 'No data found for the given range' });
    }

    const fields = [
      'device_id', 'timestamp', 'temperature', 'humidity',
      'turbidity_ntu', 'sound_level', 'soil_moisture_pct',
      'risk_score', 'oxygen_stress_index', 'cascade_stage',
      'cascade_label', 'risk_level', 'relay_state',
      'turbidity_trend_1h', 'turbidity_trend_6h', 'rapid_rise_flag'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(readings);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=lake_readings_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('[GET /export/csv] Error:', err.message);
    res.status(500).json({ error: 'Server error exporting CSV' });
  }
});

/**
 * GET /api/export/pdf
 * Export a PDF summary report for a date range.
 */
router.get('/pdf', authenticate, async (req, res) => {
  try {
    const { from, to, device } = req.query;
    const filter = {};

    if (device) filter.device_id = device;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    // Get stats
    const stats = await Reading.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avg_temp: { $avg: '$temperature' },
          min_temp: { $min: '$temperature' },
          max_temp: { $max: '$temperature' },
          avg_turbidity: { $avg: '$turbidity_ntu' },
          min_turbidity: { $min: '$turbidity_ntu' },
          max_turbidity: { $max: '$turbidity_ntu' },
          avg_sound: { $avg: '$sound_level' },
          avg_soil: { $avg: '$soil_moisture_pct' },
          avg_risk: { $avg: '$risk_score' },
          max_risk: { $max: '$risk_score' },
          avg_osi: { $avg: '$oxygen_stress_index' }
        }
      }
    ]);

    const alertCounts = await Alert.aggregate([
      { $match: { ...filter, device_id: filter.device_id } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const s = stats[0] || {};

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=lake_report_${Date.now()}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).fillColor('#0ea5e9')
       .text('Smart Lake Health Monitor', { align: 'center' });
    doc.fontSize(12).fillColor('#64748b')
       .text('Eutrophication Detection Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#94a3b8')
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    if (from || to) {
      doc.text(`Period: ${from || 'Start'} → ${to || 'Now'}`, { align: 'center' });
    }
    doc.moveDown(1);

    // Divider
    doc.strokeColor('#e2e8f0').lineWidth(1)
       .moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Summary section
    doc.fontSize(16).fillColor('#1e293b').text('Summary Statistics');
    doc.moveDown(0.5);

    const tableData = [
      ['Parameter', 'Min', 'Avg', 'Max'],
      ['Temperature (°C)', (s.min_temp || 0).toFixed(1), (s.avg_temp || 0).toFixed(1), (s.max_temp || 0).toFixed(1)],
      ['Turbidity (NTU)', (s.min_turbidity || 0).toFixed(1), (s.avg_turbidity || 0).toFixed(1), (s.max_turbidity || 0).toFixed(1)],
      ['Sound Level (dB)', '-', (s.avg_sound || 0).toFixed(1), '-'],
      ['Soil Moisture (%)', '-', (s.avg_soil || 0).toFixed(1), '-'],
      ['Risk Score', '-', (s.avg_risk || 0).toFixed(1), (s.max_risk || 0).toFixed(1)],
      ['Oxygen Stress Index', '-', (s.avg_osi || 0).toFixed(1), '-']
    ];

    // Draw table
    const colWidths = [180, 90, 90, 90];
    const startX = 55;
    let y = doc.y;

    tableData.forEach((row, rowIdx) => {
      let x = startX;
      row.forEach((cell, colIdx) => {
        const isHeader = rowIdx === 0;
        doc.fontSize(isHeader ? 10 : 9)
           .fillColor(isHeader ? '#0ea5e9' : '#334155')
           .text(cell, x, y, { width: colWidths[colIdx], align: colIdx === 0 ? 'left' : 'center' });
        x += colWidths[colIdx];
      });
      y += 20;
    });
    doc.y = y + 10;

    // Alert summary
    doc.moveDown(1);
    doc.fontSize(16).fillColor('#1e293b').text('Alert Summary');
    doc.moveDown(0.5);
    
    const alertMap = {};
    alertCounts.forEach(a => { alertMap[a._id] = a.count; });
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Total Readings: ${s.count || 0}`);
    doc.text(`Critical Alerts: ${alertMap.CRITICAL || 0}`, { continued: false });
    doc.text(`Warning Alerts: ${alertMap.WARNING || 0}`);
    doc.text(`Info Alerts: ${alertMap.INFO || 0}`);

    // Footer
    doc.moveDown(2);
    doc.strokeColor('#e2e8f0').lineWidth(1)
       .moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#94a3b8')
       .text('⚠ Oxygen Stress Index is inferred from turbidity, temperature, and sound — not a measured DO value.', { align: 'center' });
    doc.text('Smart Lake Health Monitoring System — College Mini Project', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('[GET /export/pdf] Error:', err.message);
    res.status(500).json({ error: 'Server error generating PDF' });
  }
});

module.exports = router;
