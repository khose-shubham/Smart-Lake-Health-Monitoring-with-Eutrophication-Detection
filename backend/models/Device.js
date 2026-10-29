const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: 'Lake Monitor Node'
  },
  location: {
    label: { type: String, default: 'Main Lake' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  last_seen: {
    type: Date,
    default: null
  },
  online: {
    type: Boolean,
    default: false
  },
  // Relay control
  relay_mode: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  relay_state: {
    type: Boolean,
    default: false
  },
  // Firmware info
  firmware_version: { type: String, default: '1.0.0' },
  // Offline timeout (seconds) — device considered offline after this
  offline_timeout: { type: Number, default: 60 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Device', deviceSchema);
