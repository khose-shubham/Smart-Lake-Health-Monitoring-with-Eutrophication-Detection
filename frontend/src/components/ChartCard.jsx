import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { safeFormat } from '../utils/formatDate';
import { Activity } from 'lucide-react';

const METRIC_CONFIG = {
  turbidity_ntu: {
    label: 'Turbidity',
    unit: 'NTU',
    color: '#0ea5e9',
    gradientId: 'colorTurbidity',
    domain: [0, 'auto']
  },
  eutrophication_score: {
    label: 'Eutrophication Risk',
    unit: '/100',
    color: '#f43f5e',
    gradientId: 'colorRisk',
    domain: [0, 100]
  },
  temp_c: {
    label: 'Water Temperature',
    unit: '°C',
    color: '#f97316',
    gradientId: 'colorTemp',
    domain: ['auto', 'auto']
  },
  humidity: {
    label: 'Ambient Humidity',
    unit: '%',
    color: '#06b6d4',
    gradientId: 'colorHumidity',
    domain: [0, 100]
  },
  soil_moisture_pct: {
    label: 'Runoff Soil Moisture',
    unit: '%',
    color: '#10b981',
    gradientId: 'colorSoil',
    domain: [0, 100]
  },
  sound_db_relative: {
    label: 'Acoustic / Bioactivity',
    unit: 'dB-rel',
    color: '#8b5cf6',
    gradientId: 'colorSound',
    domain: [0, 'auto']
  },
  oxygen_stress_index: {
    label: 'Oxygen Stress Index',
    unit: '/100',
    color: '#ec4899',
    gradientId: 'colorOxygen',
    domain: [0, 100]
  }
};

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const formattedDate = safeFormat(label, 'MMM d, HH:mm:ss', label);

    return (
      <div className="p-3 bg-surface-900/95 dark:bg-surface-800/95 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl text-white text-xs">
        <p className="text-slate-400 font-medium mb-1">{formattedDate}</p>
        <p className="text-base font-bold text-aqua-400 flex items-center gap-1.5">
          {typeof val === 'number' ? val.toFixed(1) : val}
          <span className="text-xs text-slate-300 font-normal">{unit}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function ChartCard({
  title = 'Sensor Telemetry',
  data = [],
  metric = 'turbidity_ntu',
  onMetricChange,
  timeRange = '24h',
  onTimeRangeChange,
  availableMetrics = ['turbidity_ntu', 'eutrophication_score', 'temp_c', 'soil_moisture_pct', 'sound_db_relative'],
  height = 280
}) {
  const currentMetric = METRIC_CONFIG[metric] || METRIC_CONFIG.turbidity_ntu;
  const timeRanges = ['1h', '6h', '24h', '7d'];

  // Formatter for X-Axis based on interval
  const formatXAxis = (tickItem) => {
    const fmt = (timeRange === '1h' || timeRange === '6h') ? 'HH:mm' : 'MM/dd HH:mm';
    return safeFormat(tickItem, fmt, tickItem);
  };

  return (
    <div className="glass-card p-6">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-lake-500" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-base">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time trend analysis and anomaly detection
          </p>
        </div>

        {/* Controls: Metric Picker & Range Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {availableMetrics.length > 1 && (
            <select
              value={metric}
              onChange={(e) => onMetricChange && onMetricChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-lake-500/20"
            >
              {availableMetrics.map((m) => (
                <option key={m} value={m}>
                  {METRIC_CONFIG[m]?.label || m}
                </option>
              ))}
            </select>
          )}

          {onTimeRangeChange && (
            <div className="flex items-center bg-slate-100 dark:bg-surface-900 p-1 rounded-xl">
              {timeRanges.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onTimeRangeChange(r)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    timeRange === r
                      ? 'bg-white dark:bg-surface-800 text-lake-600 dark:text-aqua-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ width: '100%', height }}>
        {data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
            <Activity className="w-8 h-8 mb-2 opacity-40 animate-pulse" />
            <span>No telemetry recorded for this timeframe</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={currentMetric.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                domain={currentMetric.domain}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <Tooltip
                content={<CustomTooltip unit={currentMetric.unit} />}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={currentMetric.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${currentMetric.gradientId})`}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: currentMetric.color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
