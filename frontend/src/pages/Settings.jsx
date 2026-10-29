import { useState, useEffect } from 'react';
import { thresholdsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Sliders,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    turbidity_ntu: { warning: 25, critical: 50 },
    temp_c: { warning: 30, critical: 35 },
    soil_moisture_pct: { warning: 75, critical: 90 },
    sound_db_relative: { warning: 25, critical: 15 },
    eutrophication_score: { warning: 50, critical: 75 },
    weights: {
      turbidity: 0.35,
      soil_moisture: 0.25,
      temperature: 0.25,
      sound: 0.15
    },
    relay: {
      auto_enabled: true,
      trigger_risk_score: 65,
      cooldown_minutes: 15
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const res = await thresholdsAPI.get();
        if (res.data) {
          setFormData((prev) => ({
            ...prev,
            ...res.data
          }));
        }
      } catch (err) {
        console.error('Failed to load thresholds', err);
      } finally {
        setLoading(false);
      }
    };
    fetchThresholds();
  }, []);

  const handleChange = (section, key, val) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: Number(val)
      }
    }));
  };

  const handleWeightChange = (key, val) => {
    setFormData((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: Number(val)
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Admin privileges required to update configuration.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await thresholdsAPI.update(formData);
      setMessage({ type: 'success', text: 'Thresholds and risk weights updated successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setFormData({
      turbidity_ntu: { warning: 25, critical: 50 },
      temp_c: { warning: 30, critical: 35 },
      soil_moisture_pct: { warning: 75, critical: 90 },
      sound_db_relative: { warning: 25, critical: 15 },
      eutrophication_score: { warning: 50, critical: 75 },
      weights: {
        turbidity: 0.35,
        soil_moisture: 0.25,
        temperature: 0.25,
        sound: 0.15
      },
      relay: {
        auto_enabled: true,
        trigger_risk_score: 65,
        cooldown_minutes: 15
      }
    });
  };

  const totalWeight = Object.values(formData.weights || {}).reduce((a, b) => a + Number(b), 0);

  return (
    <div className="space-y-6">
      {/* Page Header Notice */}
      {!isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>
            You are logged in with <strong>Viewer</strong> privileges. Threshold configurations are displayed in read-only mode.
          </span>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Sensor Threshold Setpoints */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-lake-500/10 text-lake-500">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Sensor Threshold Setpoints
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trigger warning and critical incident flags when telemetry breaches these bounds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Turbidity */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  Turbidity (NTU)
                </span>
                <span className="text-[11px] text-slate-400">0 – 100 NTU</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.turbidity_ntu.warning}
                    onChange={(e) => handleChange('turbidity_ntu', 'warning', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Critical Threshold</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.turbidity_ntu.critical}
                    onChange={(e) => handleChange('turbidity_ntu', 'critical', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  Water Temperature (°C)
                </span>
                <span className="text-[11px] text-slate-400">DHT11 / Probe</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.temp_c.warning}
                    onChange={(e) => handleChange('temp_c', 'warning', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Critical Threshold</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.temp_c.critical}
                    onChange={(e) => handleChange('temp_c', 'critical', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Soil Moisture */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  Runoff Soil Moisture (%)
                </span>
                <span className="text-[11px] text-slate-400">Lake Bank Sensor</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.soil_moisture_pct.warning}
                    onChange={(e) => handleChange('soil_moisture_pct', 'warning', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Critical Threshold</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.soil_moisture_pct.critical}
                    onChange={(e) => handleChange('soil_moisture_pct', 'critical', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Sound Sensor */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  Bioacoustic Level (dB-rel)
                </span>
                <span className="text-[11px] text-slate-400">Lower = Anoxia Silence</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Warning (Min Activity)</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.sound_db_relative.warning}
                    onChange={(e) => handleChange('sound_db_relative', 'warning', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Critical (Severe Silence)</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.sound_db_relative.critical}
                    onChange={(e) => handleChange('sound_db_relative', 'critical', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Eutrophication Multi-Parameter Weights */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-aqua-500/10 text-aqua-500">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Eutrophication Scoring Weights
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Normalized coefficient weights used in calculating Eutrophication Risk Index (0–100)
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300">
              Sum: <span className={Math.abs(totalWeight - 1.0) < 0.01 ? 'text-emerald-500' : 'text-amber-500'}>{totalWeight.toFixed(2)}</span> / 1.00
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Turbidity (Algal Bloom)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                disabled={!isAdmin}
                value={formData.weights.turbidity}
                onChange={(e) => handleWeightChange('turbidity', e.target.value)}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Runoff (Moisture)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                disabled={!isAdmin}
                value={formData.weights.soil_moisture}
                onChange={(e) => handleWeightChange('soil_moisture', e.target.value)}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Water Temperature
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                disabled={!isAdmin}
                value={formData.weights.temperature}
                onChange={(e) => handleWeightChange('temperature', e.target.value)}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Bioacoustic Attenuation
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                disabled={!isAdmin}
                value={formData.weights.sound}
                onChange={(e) => handleWeightChange('sound', e.target.value)}
                className="input-field font-mono"
              />
            </div>
          </div>
        </div>

        {/* Actuator Automated Rules */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Aerator Actuator Automated Dispatch
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatic relay activation setpoints and cycle protection timers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Trigger Risk Threshold
              </label>
              <input
                type="number"
                min="20"
                max="95"
                disabled={!isAdmin}
                value={formData.relay.trigger_risk_score}
                onChange={(e) => handleChange('relay', 'trigger_risk_score', e.target.value)}
                className="input-field"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Actuator turns on if risk exceeds this score
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Pump Minimum Cooldown (Mins)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                disabled={!isAdmin}
                value={formData.relay.cooldown_minutes}
                onChange={(e) => handleChange('relay', 'cooldown_minutes', e.target.value)}
                className="input-field"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Prevents rapid cycling on motor contactor
              </span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        {isAdmin && (
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Defaults
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
