const Reading = require('../models/Reading');
const Threshold = require('../models/Threshold');

/**
 * ═══════════════════════════════════════════════════════════════════
 *  Eutrophication Risk Engine
 *  Computes risk score, oxygen stress index, cascade stage, and trends
 * ═══════════════════════════════════════════════════════════════════
 */

// Cascade stage definitions
const CASCADE_STAGES = [
  { stage: 1, label: 'Nutrient Loading',    description: 'Elevated runoff nutrients entering the water body' },
  { stage: 2, label: 'Algal Proliferation', description: 'Rapid algal growth fuelled by excess nutrients' },
  { stage: 3, label: 'Oxygen Spike',        description: 'Photosynthesis-driven O₂ surge during daytime bloom' },
  { stage: 4, label: 'Die-off',             description: 'Algal collapse causing organic matter accumulation' },
  { stage: 5, label: 'Aquatic Stress',      description: 'Severe oxygen depletion threatening aquatic life' }
];

/**
 * Normalize a value to 0-100 based on safe and critical thresholds.
 * Returns 0 at safe_max, 100 at critical.
 */
function normalize(value, safeMax, critical) {
  if (value <= safeMax) return 0;
  if (value >= critical) return 100;
  return ((value - safeMax) / (critical - safeMax)) * 100;
}

/**
 * Compute the Eutrophication Risk Score (0-100).
 * Weighted sum of normalized sensor parameters.
 */
function computeRiskScore(data, thresholds) {
  const turbNorm = normalize(data.turbidity_ntu, thresholds.turb_safe_max, thresholds.turb_critical);
  const tempNorm = normalize(data.temperature, thresholds.temp_safe_max, thresholds.temp_critical);
  const soilNorm = normalize(data.soil_moisture_pct, thresholds.soil_safe_max, thresholds.soil_critical);
  const soundNorm = normalize(data.sound_level, thresholds.sound_baseline, thresholds.sound_critical);

  const score = (
    turbNorm * thresholds.weight_turbidity +
    tempNorm * thresholds.weight_temperature +
    soilNorm * thresholds.weight_soil_moisture +
    soundNorm * thresholds.weight_sound
  );

  return Math.min(100, Math.max(0, Math.round(score * 100) / 100));
}

/**
 * Compute the Oxygen Stress Index (0-100).
 * Inferred from turbidity, temperature, and sound anomalies.
 * NOTE: This is an INFERRED value, NOT a measured dissolved oxygen reading.
 */
function computeOxygenStressIndex(data, thresholds) {
  // High turbidity → high algal density → O₂ volatility
  const turbFactor = normalize(data.turbidity_ntu, thresholds.turb_safe_max, thresholds.turb_critical);
  
  // High temperature → lower dissolved O₂ saturation
  const tempFactor = normalize(data.temperature, thresholds.temp_safe_max, thresholds.temp_critical);
  
  // Sound anomalies → biological stress indicators
  const soundFactor = normalize(data.sound_level, thresholds.sound_baseline, thresholds.sound_critical);

  // Weighted combination (turbidity is strongest indicator)
  const osi = turbFactor * 0.50 + tempFactor * 0.35 + soundFactor * 0.15;

  return Math.min(100, Math.max(0, Math.round(osi * 100) / 100));
}

/**
 * Map current readings to the most likely eutrophication cascade stage.
 */
function determineCascadeStage(riskScore, data, thresholds) {
  const turbNorm = normalize(data.turbidity_ntu, thresholds.turb_safe_max, thresholds.turb_critical);
  const soilNorm = normalize(data.soil_moisture_pct, thresholds.soil_safe_max, thresholds.soil_critical);
  const tempNorm = normalize(data.temperature, thresholds.temp_safe_max, thresholds.temp_critical);

  // Stage 5: Aquatic Stress — extreme all-around
  if (riskScore >= 80 && turbNorm >= 80) {
    return CASCADE_STAGES[4];
  }
  // Stage 4: Die-off — very high turbidity (decomposing matter), high temp
  if (riskScore >= 60 && turbNorm >= 65 && tempNorm >= 40) {
    return CASCADE_STAGES[3];
  }
  // Stage 3: Oxygen Spike — moderate-high turbidity (active bloom)
  if (riskScore >= 40 && turbNorm >= 40) {
    return CASCADE_STAGES[2];
  }
  // Stage 2: Algal Proliferation — rising turbidity with warm temps
  if (riskScore >= 20 && (turbNorm >= 20 || tempNorm >= 30)) {
    return CASCADE_STAGES[1];
  }
  // Stage 1: Nutrient Loading — elevated soil moisture (runoff)
  return CASCADE_STAGES[0];
}

/**
 * Compute turbidity rate of change over 1h and 6h windows.
 */
async function computeTrends(deviceId, currentTurbidity) {
  const now = new Date();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000);

  let trend1h = 0;
  let trend6h = 0;
  let rapidRise = false;

  try {
    // 1-hour trend
    const reading1h = await Reading.findOne({
      device_id: deviceId,
      timestamp: { $lte: oneHourAgo }
    }).sort({ timestamp: -1 }).lean();

    if (reading1h) {
      trend1h = currentTurbidity - reading1h.turbidity_ntu;
    }

    // 6-hour trend
    const reading6h = await Reading.findOne({
      device_id: deviceId,
      timestamp: { $lte: sixHoursAgo }
    }).sort({ timestamp: -1 }).lean();

    if (reading6h) {
      trend6h = currentTurbidity - reading6h.turbidity_ntu;
    }

    // Get thresholds for rapid rise check
    const thresholds = await Threshold.findOne().lean();
    if (thresholds) {
      rapidRise = (trend1h >= thresholds.rapid_rise_threshold_1h) ||
                  (trend6h >= thresholds.rapid_rise_threshold_6h);
    }
  } catch (err) {
    console.error('[RiskEngine] Trend computation error:', err.message);
  }

  return {
    turbidity_trend_1h: Math.round(trend1h * 100) / 100,
    turbidity_trend_6h: Math.round(trend6h * 100) / 100,
    rapid_rise_flag: rapidRise
  };
}

/**
 * Determine the overall risk level string.
 */
function getRiskLevel(riskScore) {
  if (riskScore >= 60) return 'CRITICAL';
  if (riskScore >= 30) return 'WARNING';
  return 'SAFE';
}

/**
 * Main risk analysis function — processes a reading and returns enriched data.
 */
async function analyzeReading(data) {
  // Load thresholds from DB (or use defaults)
  let thresholds = await Threshold.findOne().lean();
  if (!thresholds) {
    thresholds = new Threshold();
    await thresholds.save();
    thresholds = thresholds.toObject();
  }

  // Compute risk score
  const riskScore = computeRiskScore(data, thresholds);
  
  // Compute oxygen stress index
  const oxygenStress = computeOxygenStressIndex(data, thresholds);
  
  // Determine cascade stage
  const cascadeInfo = determineCascadeStage(riskScore, data, thresholds);
  
  // Compute trends
  const trends = await computeTrends(data.device_id, data.turbidity_ntu);
  
  // Get risk level
  const riskLevel = getRiskLevel(riskScore);

  return {
    risk_score: riskScore,
    oxygen_stress_index: oxygenStress,
    cascade_stage: cascadeInfo.stage,
    cascade_label: cascadeInfo.label,
    risk_level: riskLevel,
    ...trends,
    thresholds // Pass thresholds for alert generation
  };
}

module.exports = {
  analyzeReading,
  computeRiskScore,
  computeOxygenStressIndex,
  determineCascadeStage,
  computeTrends,
  getRiskLevel,
  CASCADE_STAGES
};
