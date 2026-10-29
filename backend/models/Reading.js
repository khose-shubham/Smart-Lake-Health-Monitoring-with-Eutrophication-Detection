const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Raw sensor values
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  turbidity_raw: { type: Number },
  turbidity_ntu: { type: Number, required: true },
  sound_raw: { type: Number },
  sound_level: { type: Number, required: true },
  soil_moisture_raw: { type: Number },
  soil_moisture_pct: { type: Number, required: true },
  // Computed by risk engine
  risk_score: { type: Number, default: 0 },             // 0-100
  oxygen_stress_index: { type: Number, default: 0 },     // 0-100
  cascade_stage: { type: Number, default: 1, min: 1, max: 5 },
  cascade_label: { type: String, default: 'Nutrient Loading' },
  risk_level: {
    type: String,
    enum: ['SAFE', 'WARNING', 'CRITICAL'],
    default: 'SAFE'
  },
  // Device-reported relay state
  relay_state: { type: Boolean, default: false },
  // Trend data (computed)
  turbidity_trend_1h: { type: Number, default: 0 },      // NTU/hour
  turbidity_trend_6h: { type: Number, default: 0 },      // NTU/6hours
  rapid_rise_flag: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Compound index for efficient time-range queries
readingSchema.index({ device_id: 1, timestamp: -1 });
readingSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Reading', readingSchema);
