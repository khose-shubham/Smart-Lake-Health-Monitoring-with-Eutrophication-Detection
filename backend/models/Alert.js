const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active',
    index: true
  },
  parameter: {
    type: String,
    required: true  // e.g. 'turbidity', 'temperature', 'risk_score', etc.
  },
  message: {
    type: String,
    required: true
  },
  value: { type: Number },
  threshold: { type: Number },
  cascade_stage: { type: Number },
  // Acknowledge / resolve workflow
  acknowledged_by: { type: String },
  acknowledged_at: { type: Date },
  resolved_by: { type: String },
  resolved_at: { type: Date },
  resolution_note: { type: String },
  // Deduplication key — prevent repeat alerts within cooldown
  dedup_key: {
    type: String,
    index: true
  },
  // Notification tracking
  email_sent: { type: Boolean, default: false },
  telegram_sent: { type: Boolean, default: false }
}, {
  timestamps: true
});

alertSchema.index({ createdAt: -1 });
alertSchema.index({ device_id: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
