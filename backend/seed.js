/**
 * ═══════════════════════════════════════════════════════════════════
 *  Seed Script — Populates the database with sample data
 *  Run: node seed.js
 * ═══════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Device = require('./models/Device');
const Threshold = require('./models/Threshold');
const Reading = require('./models/Reading');
const Alert = require('./models/Alert');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Device.deleteMany({});
    await Threshold.deleteMany({});
    await Reading.deleteMany({});
    await Alert.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // ── Create Users ──────────────────────────────────────────────
    const admin = await User.create({
      username: 'admin',
      email: 'admin@lakemonitor.com',
      password: 'admin123',
      role: 'admin'
    });

    const viewer = await User.create({
      username: 'viewer',
      email: 'viewer@lakemonitor.com',
      password: 'viewer123',
      role: 'viewer'
    });

    console.log('👤 Users created: admin / admin123, viewer / viewer123');

    // ── Create Devices ────────────────────────────────────────────
    const device1 = await Device.create({
      device_id: 'LAKE_NODE_01',
      name: 'Main Lake — North Shore',
      location: { label: 'North Shore', lat: 12.9716, lng: 77.5946 },
      online: true,
      last_seen: new Date(),
      relay_mode: 'auto',
      relay_state: false
    });

    const device2 = await Device.create({
      device_id: 'LAKE_NODE_02',
      name: 'Secondary — South Bank',
      location: { label: 'South Bank', lat: 12.9700, lng: 77.5960 },
      online: false,
      relay_mode: 'auto',
      relay_state: false
    });

    console.log('📡 Devices created: LAKE_NODE_01, LAKE_NODE_02');

    // ── Create Thresholds (defaults) ──────────────────────────────
    await Threshold.create({
      temp_safe_min: 10,
      temp_safe_max: 25,
      temp_warning: 28,
      temp_critical: 33,
      turb_safe_min: 0,
      turb_safe_max: 10,
      turb_warning: 30,
      turb_critical: 50,
      sound_baseline: 0,
      sound_warning: 15,
      sound_critical: 30,
      soil_safe_min: 20,
      soil_safe_max: 40,
      soil_warning: 60,
      soil_critical: 80,
      weight_turbidity: 0.40,
      weight_temperature: 0.25,
      weight_soil_moisture: 0.20,
      weight_sound: 0.15,
      cal_turb_slope: -1120.4,
      cal_turb_intercept: 5000.0,
      cal_turb_vref: 3.3,
      rapid_rise_threshold_1h: 10,
      rapid_rise_threshold_6h: 25,
      alert_cooldown_minutes: 15
    });

    console.log('⚙️  Thresholds configured');

    // ── Generate Sample Readings (last 24 hours) ──────────────────
    const now = Date.now();
    const readings = [];

    for (let i = 0; i < 240; i++) {  // ~10s intervals for 24h ≈ 8640, but 240 samples for demo
      const timestamp = new Date(now - (240 - i) * 6 * 60 * 1000); // Every 6 min
      const hour = timestamp.getHours();

      // Simulate daily patterns
      const tempBase = 22 + 5 * Math.sin((hour - 6) * Math.PI / 12); // peaks at noon
      const turbBase = 8 + 3 * Math.sin((hour - 14) * Math.PI / 12); // peaks afternoon
      const soundBase = 2 + 1.5 * Math.sin((hour - 8) * Math.PI / 12);
      const soilBase = 30 + 5 * Math.sin((hour - 4) * Math.PI / 12);

      // Add noise
      const temp = Math.max(5, tempBase + (Math.random() - 0.5) * 3);
      const turb = Math.max(0, turbBase + (Math.random() - 0.5) * 4);
      const sound = Math.max(0, soundBase + (Math.random() - 0.5) * 2);
      const soil = Math.max(0, Math.min(100, soilBase + (Math.random() - 0.5) * 8));
      const humidity = 55 + (Math.random() - 0.5) * 20;

      // Simple risk score
      const riskScore = Math.min(100, Math.max(0,
        (turb / 50) * 40 + (Math.max(0, temp - 25) / 8) * 25 +
        (Math.max(0, soil - 40) / 40) * 20 + (sound / 30) * 15
      ));

      const riskLevel = riskScore >= 60 ? 'CRITICAL' : riskScore >= 30 ? 'WARNING' : 'SAFE';
      const cascadeStage = riskScore >= 80 ? 5 : riskScore >= 60 ? 4 : riskScore >= 40 ? 3 : riskScore >= 20 ? 2 : 1;
      const cascadeLabels = ['Nutrient Loading', 'Algal Proliferation', 'Oxygen Spike', 'Die-off', 'Aquatic Stress'];

      readings.push({
        device_id: 'LAKE_NODE_01',
        timestamp,
        temperature: parseFloat(temp.toFixed(1)),
        humidity: parseFloat(humidity.toFixed(1)),
        turbidity_raw: Math.round(turb * 80),
        turbidity_ntu: parseFloat(turb.toFixed(1)),
        sound_raw: Math.round(sound * 130),
        sound_level: parseFloat(sound.toFixed(1)),
        soil_moisture_raw: Math.round(soil * 40),
        soil_moisture_pct: parseFloat(soil.toFixed(1)),
        risk_score: parseFloat(riskScore.toFixed(1)),
        oxygen_stress_index: parseFloat((riskScore * 0.8 + Math.random() * 10).toFixed(1)),
        cascade_stage: cascadeStage,
        cascade_label: cascadeLabels[cascadeStage - 1],
        risk_level: riskLevel,
        relay_state: riskLevel !== 'SAFE',
        turbidity_trend_1h: parseFloat(((Math.random() - 0.3) * 5).toFixed(1)),
        turbidity_trend_6h: parseFloat(((Math.random() - 0.3) * 12).toFixed(1)),
        rapid_rise_flag: false
      });
    }

    await Reading.insertMany(readings);
    console.log(`📊 ${readings.length} sample readings created`);

    // ── Generate Sample Alerts ────────────────────────────────────
    const sampleAlerts = [
      {
        device_id: 'LAKE_NODE_01',
        severity: 'WARNING',
        status: 'resolved',
        parameter: 'turbidity',
        message: 'Turbidity elevated at 32.4 NTU (warning: 30 NTU)',
        value: 32.4,
        threshold: 30,
        resolved_by: 'admin',
        resolved_at: new Date(now - 3600000),
        resolution_note: 'Natural settling observed'
      },
      {
        device_id: 'LAKE_NODE_01',
        severity: 'CRITICAL',
        status: 'acknowledged',
        parameter: 'risk_score',
        message: 'Eutrophication Risk Score critically high at 72.5/100 — Stage: Die-off',
        value: 72.5,
        threshold: 60,
        cascade_stage: 4,
        acknowledged_by: 'admin',
        acknowledged_at: new Date(now - 1800000)
      },
      {
        device_id: 'LAKE_NODE_01',
        severity: 'WARNING',
        status: 'active',
        parameter: 'temperature',
        message: 'Temperature elevated at 29.3°C (warning: 28°C)',
        value: 29.3,
        threshold: 28
      },
      {
        device_id: 'LAKE_NODE_01',
        severity: 'INFO',
        status: 'active',
        parameter: 'turbidity_trend',
        message: 'Turbidity trend stabilizing — no rapid rise detected',
        value: 2.1,
        threshold: 10
      }
    ];

    await Alert.insertMany(sampleAlerts);
    console.log(`🔔 ${sampleAlerts.length} sample alerts created`);

    // ── Done ──────────────────────────────────────────────────────
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  ✅ Database seeded successfully!');
    console.log('  📧 Login: admin@lakemonitor.com / admin123');
    console.log('  📧 Login: viewer@lakemonitor.com / viewer123');
    console.log('═══════════════════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
