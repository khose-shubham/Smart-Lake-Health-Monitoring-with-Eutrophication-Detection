/**
 * ═══════════════════════════════════════════════════════════════════
 *  🌊 AquaSense — ESP32 Hardware & Ecological Event Simulator
 *  Simulates real-time telemetry packets from an ESP32 edge station.
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Usage:
 *   node simulator.js                      # Auto-cycles through ecological stages
 *   node simulator.js --scenario=healthy   # Normal oligotrophic lake
 *   node simulator.js --scenario=runoff    # Agricultural rainstorm runoff surge
 *   node simulator.js --scenario=bloom     # Severe algal bloom & anoxia collapse
 *   node simulator.js --interval=5000      # Send every 5 seconds (default: 10s)
 */

const axios = require('axios');
const readline = require('readline');

const API_URL = process.env.BACKEND_URL || 'http://localhost:5000/api/readings';
const DEVICE_KEY = process.env.DEVICE_API_KEY || 'lake-monitor-api-key-2024';
const DEVICE_ID = process.env.DEVICE_ID || 'LAKE_NODE_01';

// Parse command line arguments
const args = process.argv.slice(2);
let scenario = 'cycle';
let intervalMs = 10000;

args.forEach((arg) => {
  if (arg.startsWith('--scenario=')) scenario = arg.split('=')[1];
  if (arg.startsWith('--interval=')) intervalMs = parseInt(arg.split('=')[1], 10) || 10000;
});

let step = 0;
let relayState = false;

// Ecological stage presets
const SCENARIOS = {
  healthy: {
    name: 'Stage 1: Oligotrophic (Pristine Lake)',
    tempBase: 22.5,
    humidityBase: 65,
    turbidityBase: 6.5,
    soundBase: 48.0,
    soilBase: 35.0,
    desc: 'Low nutrients, clear water, high oxygen, normal fish acoustics'
  },
  runoff: {
    name: 'Stage 2: Agricultural Influx & Runoff',
    tempBase: 25.0,
    humidityBase: 88,
    turbidityBase: 28.0,
    soundBase: 58.0,
    soilBase: 86.0,
    desc: 'Lake bank saturated, fertilizer runoff into littoral zone'
  },
  bloom: {
    name: 'Stage 3-4: Algal Bloom & Anoxia Hypoxia',
    tempBase: 32.5,
    humidityBase: 78,
    turbidityBase: 68.0,
    soundBase: 12.0, // Hypoxic silence
    soilBase: 65.0,
    desc: 'Dense algal bloom, light blocked, bacterial decay depleting O2'
  }
};

function getTelemetry(mode) {
  step++;
  let target = SCENARIOS.healthy;

  if (mode === 'runoff') {
    target = SCENARIOS.runoff;
  } else if (mode === 'bloom') {
    target = SCENARIOS.bloom;
  } else if (mode === 'cycle') {
    // Cycles through Healthy (0-3), Runoff (4-7), Bloom (8-12), then recovery (13-16)
    const cycleStep = step % 16;
    if (cycleStep <= 4) target = SCENARIOS.healthy;
    else if (cycleStep <= 8) target = SCENARIOS.runoff;
    else if (cycleStep <= 13) target = SCENARIOS.bloom;
    else target = SCENARIOS.runoff;
  }

  // Gaussian noise generator
  const noise = (mag) => (Math.random() - 0.5) * 2 * mag;

  const temp = Math.max(10, +(target.tempBase + noise(1.2)).toFixed(1));
  const humidity = Math.min(100, Math.max(20, +(target.humidityBase + noise(3.0)).toFixed(1)));
  const turbidity = Math.max(0, +(target.turbidityBase + noise(3.5)).toFixed(1));
  const sound = Math.max(2, +(target.soundBase + noise(2.5)).toFixed(1));
  const soil = Math.min(100, Math.max(5, +(target.soilBase + noise(3.0)).toFixed(1)));

  // Simulated raw 12-bit ADC values (0 - 4095) for ESP32 fidelity
  const turbidityRaw = Math.min(4095, Math.max(0, Math.round(3200 - turbidity * 30)));
  const soundRaw = Math.min(4095, Math.max(0, Math.round(sound * 35)));
  const soilRaw = Math.min(4095, Math.max(0, Math.round(4095 - (soil / 100) * 2500)));

  return {
    device_id: DEVICE_ID,
    timestamp: new Date().toISOString(),
    temperature: temp,
    humidity: humidity,
    turbidity_raw: turbidityRaw,
    turbidity_ntu: turbidity,
    sound_raw: soundRaw,
    sound_level: sound,
    soil_moisture_raw: soilRaw,
    soil_moisture_pct: soil,
    relay_state: relayState,
    _scenarioName: target.name
  };
}

async function sendPacket() {
  const telemetry = getTelemetry(scenario);
  const { _scenarioName, ...payload } = telemetry;

  const timestamp = new Date().toLocaleTimeString();

  try {
    const res = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': DEVICE_KEY,
        'X-Device-Key': DEVICE_KEY
      },
      timeout: 5000
    });

    const data = res.data;
    const risk = data.risk_score !== undefined ? data.risk_score.toFixed(1) : 'N/A';
    const stage = data.cascade_stage || 1;
    const stageName = data.cascade_label || 'Healthy';

    // Auto-update relay status based on backend response if actuator triggered
    if (data.reading?.relay_state !== undefined) {
      relayState = data.reading.relay_state;
    }

    console.log(
      `[${timestamp}] 📡 Packet #${step} Sent | Turb: ${payload.turbidity_ntu} NTU | Temp: ${payload.temperature}°C | Soil: ${payload.soil_moisture_pct}% | Sound: ${payload.sound_level} dB | Risk: ${risk}/100 [Stage ${stage}: ${stageName}]`
    );

    if (relayState) {
      console.log(`         🌀 AERATOR RELAY ACTIVE (GPIO 18 = HIGH) — Oxygen replenishment injection`);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log(`[${timestamp}] ❌ Connection refused at ${API_URL}. Is the backend running?`);
    } else {
      console.log(`[${timestamp}] ⚠️ Request error:`, err.response?.data || err.message);
    }
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🌊 AquaSense ESP32 Hardware Simulator Initialized');
console.log(`  Target URL: ${API_URL}`);
console.log(`  Device ID:  ${DEVICE_ID}`);
console.log(`  Interval:   ${intervalMs / 1000}s`);
console.log(`  Scenario:   ${scenario.toUpperCase()}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Commands: type "healthy", "runoff", "bloom", or "cycle" to switch mode');
console.log('═══════════════════════════════════════════════════════════════\n');

// Start periodic sending
sendPacket();
const timer = setInterval(sendPacket, intervalMs);

// Interactive CLI command listener
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (line) => {
  const cmd = line.trim().toLowerCase();
  if (['healthy', 'runoff', 'bloom', 'cycle'].includes(cmd)) {
    scenario = cmd;
    console.log(`\n🔄 Switched scenario to: ${cmd.toUpperCase()}\n`);
  } else if (cmd === 'exit' || cmd === 'quit') {
    clearInterval(timer);
    process.exit(0);
  } else if (cmd) {
    console.log(`Unknown command "${cmd}". Try: healthy, runoff, bloom, cycle, exit`);
  }
});
