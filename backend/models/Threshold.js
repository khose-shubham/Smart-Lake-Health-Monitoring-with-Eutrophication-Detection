const mongoose = require('mongoose');

const thresholdSchema = new mongoose.Schema({
  // Singleton document — one config for the system
  // Temperature thresholds
  temp_safe_min: { type: Number, default: 10 },
  temp_safe_max: { type: Number, default: 25 },
  temp_warning: { type: Number, default: 28 },
  temp_critical: { type: Number, default: 33 },

  // Turbidity thresholds (NTU)
  turb_safe_min: { type: Number, default: 0 },
  turb_safe_max: { type: Number, default: 10 },
  turb_warning: { type: Number, default: 30 },
  turb_critical: { type: Number, default: 50 },

  // Sound thresholds (dB above baseline)
  sound_baseline: { type: Number, default: 0 },
  sound_warning: { type: Number, default: 15 },
  sound_critical: { type: Number, default: 30 },

  // Soil moisture thresholds (%)
  soil_safe_min: { type: Number, default: 20 },
  soil_safe_max: { type: Number, default: 40 },
  soil_warning: { type: Number, default: 60 },
  soil_critical: { type: Number, default: 80 },

  // Risk score weights (must sum to 1.0)
  weight_turbidity: { type: Number, default: 0.40 },
  weight_temperature: { type: Number, default: 0.25 },
  weight_soil_moisture: { type: Number, default: 0.20 },
  weight_sound: { type: Number, default: 0.15 },

  // Calibration constants (turbidity sensor)
  cal_turb_slope: { type: Number, default: -1120.4 },
  cal_turb_intercept: { type: Number, default: 5000.0 },
  cal_turb_vref: { type: Number, default: 3.3 },

  // Trend thresholds
  rapid_rise_threshold_1h: { type: Number, default: 10 },  // NTU/hour
  rapid_rise_threshold_6h: { type: Number, default: 25 },  // NTU/6hours

  // Alert cooldown (minutes) — prevent duplicate alerts
  alert_cooldown_minutes: { type: Number, default: 15 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Threshold', thresholdSchema);
