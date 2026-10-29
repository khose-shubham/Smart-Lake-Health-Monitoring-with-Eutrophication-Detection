const Alert = require('../models/Alert');
const nodemailer = require('nodemailer');

/**
 * ═══════════════════════════════════════════════════════════════════
 *  Alert Service
 *  Generates, deduplicates, and dispatches alerts
 * ═══════════════════════════════════════════════════════════════════
 */

// Cooldown cache: { dedupKey: lastAlertTimestamp }
const cooldownCache = new Map();

/**
 * Generate a deduplication key for an alert.
 */
function makeDedupKey(deviceId, parameter, severity) {
  return `${deviceId}:${parameter}:${severity}`;
}

/**
 * Check if an alert is within the cooldown window.
 */
function isInCooldown(dedupKey, cooldownMinutes) {
  const lastTime = cooldownCache.get(dedupKey);
  if (!lastTime) return false;
  const elapsed = (Date.now() - lastTime) / (1000 * 60);
  return elapsed < cooldownMinutes;
}

/**
 * Generate alerts based on a reading and its computed risk analysis.
 * Returns array of newly created alerts.
 */
async function generateAlerts(reading, analysis, io) {
  const alerts = [];
  const cooldownMinutes = analysis.thresholds?.alert_cooldown_minutes || 15;
  const t = analysis.thresholds;

  // --- Turbidity Alerts ---
  if (reading.turbidity_ntu > t.turb_critical) {
    alerts.push({
      severity: 'CRITICAL',
      parameter: 'turbidity',
      message: `Turbidity critically high at ${reading.turbidity_ntu.toFixed(1)} NTU (threshold: ${t.turb_critical} NTU)`,
      value: reading.turbidity_ntu,
      threshold: t.turb_critical
    });
  } else if (reading.turbidity_ntu > t.turb_warning) {
    alerts.push({
      severity: 'WARNING',
      parameter: 'turbidity',
      message: `Turbidity elevated at ${reading.turbidity_ntu.toFixed(1)} NTU (warning: ${t.turb_warning} NTU)`,
      value: reading.turbidity_ntu,
      threshold: t.turb_warning
    });
  }

  // --- Temperature Alerts ---
  if (reading.temperature > t.temp_critical) {
    alerts.push({
      severity: 'CRITICAL',
      parameter: 'temperature',
      message: `Temperature critically high at ${reading.temperature.toFixed(1)}°C (threshold: ${t.temp_critical}°C)`,
      value: reading.temperature,
      threshold: t.temp_critical
    });
  } else if (reading.temperature > t.temp_warning) {
    alerts.push({
      severity: 'WARNING',
      parameter: 'temperature',
      message: `Temperature elevated at ${reading.temperature.toFixed(1)}°C (warning: ${t.temp_warning}°C)`,
      value: reading.temperature,
      threshold: t.temp_warning
    });
  }

  // --- Soil Moisture Alerts ---
  if (reading.soil_moisture_pct > t.soil_critical) {
    alerts.push({
      severity: 'CRITICAL',
      parameter: 'soil_moisture',
      message: `Soil moisture critically high at ${reading.soil_moisture_pct.toFixed(1)}% — heavy runoff likely`,
      value: reading.soil_moisture_pct,
      threshold: t.soil_critical
    });
  } else if (reading.soil_moisture_pct > t.soil_warning) {
    alerts.push({
      severity: 'WARNING',
      parameter: 'soil_moisture',
      message: `Soil moisture elevated at ${reading.soil_moisture_pct.toFixed(1)}% — runoff risk`,
      value: reading.soil_moisture_pct,
      threshold: t.soil_warning
    });
  }

  // --- Sound Alerts ---
  if (reading.sound_level > t.sound_critical) {
    alerts.push({
      severity: 'CRITICAL',
      parameter: 'sound',
      message: `Sound anomaly detected: +${reading.sound_level.toFixed(1)} dB above baseline`,
      value: reading.sound_level,
      threshold: t.sound_critical
    });
  } else if (reading.sound_level > t.sound_warning) {
    alerts.push({
      severity: 'WARNING',
      parameter: 'sound',
      message: `Sound elevated: +${reading.sound_level.toFixed(1)} dB above baseline`,
      value: reading.sound_level,
      threshold: t.sound_warning
    });
  }

  // --- Eutrophication Risk Score Alert ---
  if (analysis.risk_score >= 60) {
    alerts.push({
      severity: 'CRITICAL',
      parameter: 'risk_score',
      message: `Eutrophication Risk Score critically high at ${analysis.risk_score.toFixed(1)}/100 — Stage: ${analysis.cascade_label}`,
      value: analysis.risk_score,
      threshold: 60,
      cascade_stage: analysis.cascade_stage
    });
  } else if (analysis.risk_score >= 30) {
    alerts.push({
      severity: 'WARNING',
      parameter: 'risk_score',
      message: `Eutrophication Risk Score elevated at ${analysis.risk_score.toFixed(1)}/100 — Stage: ${analysis.cascade_label}`,
      value: analysis.risk_score,
      threshold: 30,
      cascade_stage: analysis.cascade_stage
    });
  }

  // --- Rapid Rise Alert ---
  if (analysis.rapid_rise_flag) {
    alerts.push({
      severity: 'WARNING',
      parameter: 'turbidity_trend',
      message: `Rapid turbidity rise detected: +${analysis.turbidity_trend_1h.toFixed(1)} NTU/hr, +${analysis.turbidity_trend_6h.toFixed(1)} NTU/6hr`,
      value: analysis.turbidity_trend_1h,
      threshold: t.rapid_rise_threshold_1h
    });
  }

  // --- Dedup + Save ---
  const saved = [];
  for (const alertData of alerts) {
    const dedupKey = makeDedupKey(reading.device_id, alertData.parameter, alertData.severity);
    
    if (isInCooldown(dedupKey, cooldownMinutes)) {
      continue; // Skip duplicate
    }

    const alert = new Alert({
      device_id: reading.device_id,
      ...alertData,
      dedup_key: dedupKey
    });

    await alert.save();
    cooldownCache.set(dedupKey, Date.now());
    saved.push(alert);

    // Emit via Socket.IO
    if (io) {
      io.emit('alert', alert.toObject());
    }

    // Send email/telegram for CRITICAL
    if (alertData.severity === 'CRITICAL') {
      await sendNotifications(alert);
    }
  }

  return saved;
}

/**
 * Send email and/or Telegram notifications for critical alerts.
 */
async function sendNotifications(alert) {
  // Email
  if (process.env.ENABLE_EMAIL === 'true') {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"Lake Monitor" <${process.env.SMTP_USER}>`,
        to: process.env.ALERT_EMAIL_TO,
        subject: `🚨 CRITICAL Alert — ${alert.parameter}`,
        html: `
          <h2>🚨 Critical Lake Alert</h2>
          <p><strong>Device:</strong> ${alert.device_id}</p>
          <p><strong>Parameter:</strong> ${alert.parameter}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Value:</strong> ${alert.value} | <strong>Threshold:</strong> ${alert.threshold}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p><em>Smart Lake Health Monitoring System</em></p>
        `
      });

      alert.email_sent = true;
      await alert.save();
      console.log('[Alert] Email sent for:', alert.parameter);
    } catch (err) {
      console.error('[Alert] Email error:', err.message);
    }
  }

  // Telegram
  if (process.env.ENABLE_TELEGRAM === 'true') {
    try {
      const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const text = `🚨 *CRITICAL ALERT*\n\n📍 Device: ${alert.device_id}\n📊 ${alert.parameter}: ${alert.value}\n⚠️ ${alert.message}\n🕐 ${new Date().toLocaleString()}`;

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'Markdown'
        })
      });

      alert.telegram_sent = true;
      await alert.save();
      console.log('[Alert] Telegram sent for:', alert.parameter);
    } catch (err) {
      console.error('[Alert] Telegram error:', err.message);
    }
  }
}

module.exports = { generateAlerts };
