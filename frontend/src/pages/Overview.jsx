import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { readingsAPI, alertsAPI, thresholdsAPI } from '../utils/api';
import RiskGauge from '../components/RiskGauge';
import GaugeCard from '../components/GaugeCard';
import CascadeIndicator from '../components/CascadeIndicator';
import RelayControl from '../components/RelayControl';
import ChartCard from '../components/ChartCard';
import AlertBadge from '../components/AlertBadge';
import {
  Droplet,
  Thermometer,
  CloudRain,
  Volume2,
  Wind,
  AlertTriangle,
  RotateCw,
  Clock
} from 'lucide-react';
import { safeFormat } from '../utils/formatDate';

export default function Overview() {
  const { latestReading: socketReading } = useOutletContext() || {};
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch initial telemetry and alerts
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [latestRes, histRes, alertRes, threshRes] = await Promise.all([
        readingsAPI.getLatest(),
        readingsAPI.getReadings({ limit: 40 }),
        alertsAPI.getAlerts({ resolved: false, limit: 5 }),
        thresholdsAPI.get()
      ]);

      // Normalize latest reading (could be single device or keyed by device_id)
      let latest = null;
      if (latestRes.data) {
        if (latestRes.data.temperature !== undefined || latestRes.data.turbidity_ntu !== undefined) {
          latest = latestRes.data;
        } else {
          const devs = Object.values(latestRes.data);
          if (devs.length > 0) latest = devs[0];
        }
      }
      if (latest) setReading(latest);

      // Normalize history array
      const rawList = histRes.data?.readings || histRes.data?.data || (Array.isArray(histRes.data) ? histRes.data : []);
      const normalizedHistory = rawList.map(r => ({
        ...r,
        temp_c: r.temperature ?? r.temp_c,
        sound_db_relative: r.sound_level ?? r.sound_db_relative,
        eutrophication_score: r.risk_score ?? r.eutrophication_score,
        eutrophication_stage: r.cascade_stage ?? r.eutrophication_stage
      }));
      setHistory(normalizedHistory.reverse());

      // Normalize alerts
      const rawAlerts = alertRes.data?.alerts || alertRes.data?.data || (Array.isArray(alertRes.data) ? alertRes.data : []);
      setActiveAlerts(rawAlerts);

      if (threshRes.data) setThresholds(threshRes.data);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update when socket emits new reading
  useEffect(() => {
    if (socketReading) {
      const normSocket = {
        ...socketReading,
        temp_c: socketReading.temperature ?? socketReading.temp_c,
        sound_db_relative: socketReading.sound_level ?? socketReading.sound_db_relative,
        eutrophication_score: socketReading.risk_score ?? socketReading.eutrophication_score,
        eutrophication_stage: socketReading.cascade_stage ?? socketReading.eutrophication_stage
      };
      setReading(normSocket);
      setHistory(prev => {
        const next = [...prev, normSocket];
        return next.slice(-50); // keep last 50
      });
    }
  }, [socketReading]);

  // Determine status thresholds
  const getStatus = (val, warnThreshold, critThreshold, invert = false) => {
    if (val === undefined || val === null) return 'safe';
    if (!invert) {
      if (val >= critThreshold) return 'critical';
      if (val >= warnThreshold) return 'warning';
      return 'safe';
    } else {
      if (val <= critThreshold) return 'critical';
      if (val <= warnThreshold) return 'warning';
      return 'safe';
    }
  };

  const currentTurbidity = reading?.turbidity_ntu ?? 12.5;
  const currentTemp = reading?.temperature ?? reading?.temp_c ?? 24.2;
  const currentHumidity = reading?.humidity ?? 68.0;
  const currentSoil = reading?.soil_moisture_pct ?? 45.0;
  const currentSound = reading?.sound_level ?? reading?.sound_db_relative ?? 38.0;
  const currentRisk = reading?.risk_score ?? reading?.eutrophication_score ?? 18;
  const currentStage = reading?.cascade_stage ?? reading?.eutrophication_stage ?? 1;
  const currentOxygenStress = reading?.oxygen_stress_index ?? 12;
  const currentRelay = reading?.relay_state ?? false;
  const currentRelayReason = reading?.relay_trigger_reason || 'Normal baseline parameter';

  return (
    <div className="space-y-6">
      {/* Top Banner with Device Telemetry Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 dark:bg-surface-800/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-neon-green" />
          <div className="text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Station ID: {reading?.device_id || 'ESP32-LAKE-01'}
            </span>
            <span className="text-slate-400 mx-2">•</span>
            <span className="text-slate-500 dark:text-slate-400">
              Firmware v1.2 (Median 10-filter)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Updated: {safeFormat(reading?.timestamp, 'HH:mm:ss', 'Streaming')}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-surface-600 transition-colors"
            title="Refresh Telemetry"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Section: Risk Gauge & Eutrophication Cascade */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Primary Risk Gauge */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <RiskGauge
            score={currentRisk}
            stage={currentStage}
            oxygenStress={currentOxygenStress}
          />
        </div>

        {/* Right: Cascade Progression & Actuator Control */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <CascadeIndicator currentStage={currentStage} />
          <RelayControl
            relayState={currentRelay}
            mode={reading?.relay_mode || 'auto'}
            reason={currentRelayReason}
            onRelayChange={(update) => {
              setReading(prev => ({ ...prev, ...update }));
            }}
          />
        </div>
      </div>

      {/* Sensor Gauge Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <GaugeCard
          label="Water Turbidity"
          value={currentTurbidity}
          unit="NTU"
          min={0}
          max={100}
          icon={Droplet}
          status={getStatus(
            currentTurbidity,
            thresholds?.turbidity_ntu?.warning || 25,
            thresholds?.turbidity_ntu?.critical || 50
          )}
          hint="Target: <15 NTU for safe light penetration"
        />

        <GaugeCard
          label="Water Temp"
          value={currentTemp}
          unit="°C"
          min={10}
          max={45}
          icon={Thermometer}
          status={getStatus(
            currentTemp,
            thresholds?.temp_c?.warning || 30,
            thresholds?.temp_c?.critical || 35
          )}
          hint="High temps trigger algal bloom acceleration"
        />

        <GaugeCard
          label="Soil Moisture (Runoff)"
          value={currentSoil}
          unit="%"
          min={0}
          max={100}
          icon={CloudRain}
          status={getStatus(
            currentSoil,
            thresholds?.soil_moisture_pct?.warning || 75,
            thresholds?.soil_moisture_pct?.critical || 90
          )}
          hint="Lake-bank proxy for fertilizer leaching"
        />

        <GaugeCard
          label="Bioacoustic Sound"
          value={currentSound}
          unit="dB-rel"
          min={0}
          max={100}
          icon={Volume2}
          status={getStatus(
            currentSound,
            thresholds?.sound_db_relative?.warning || 25,
            thresholds?.sound_db_relative?.critical || 15,
            true // lower is worse (silence = anoxia)
          )}
          hint="Depressed sound indicates fish inactivity"
        />

        <GaugeCard
          label="Relative Humidity"
          value={currentHumidity}
          unit="%"
          min={0}
          max={100}
          icon={Wind}
          status="safe"
          hint="Atmospheric vapor & surface evaporation"
        />
      </div>

      {/* Real-time Trend & Active Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real-time Trend Chart */}
        <div className="lg:col-span-8">
          <ChartCard
            title="Real-Time Telemetry Trend"
            data={history}
            metric="turbidity_ntu"
            timeRange="1h"
          />
        </div>

        {/* Live Active Alerts Panel */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-800 dark:text-white text-base">
                  Active Alerts
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300">
                {activeAlerts.length} Active
              </span>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                No active warnings. Ecological parameters within nominal limits.
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert._id || alert.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/50 dark:border-slate-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <AlertBadge severity={alert.severity} />
                      <span className="text-[10px] text-slate-400">
                        {safeFormat(alert.createdAt || alert.timestamp, 'HH:mm', 'Recent')}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {alert.title || alert.type}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <a
              href="/alerts"
              className="text-xs font-semibold text-lake-500 hover:text-lake-600 dark:text-aqua-400 flex items-center justify-center gap-1"
            >
              View incident management logs →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
