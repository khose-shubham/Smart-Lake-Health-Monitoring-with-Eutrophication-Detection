import React, { useState, useEffect, useMemo } from 'react';
import { readingsAPI } from '../utils/api';
import ChartCard from '../components/ChartCard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { safeFormat } from '../utils/formatDate';
import {
  TrendingUp,
  BarChart2,
  Sparkles,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [activePrimaryMetric, setActivePrimaryMetric] = useState('turbidity_ntu');

  // Fetch telemetry history based on selected range
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        let limit = 100;
        if (timeRange === '1h') limit = 30;
        else if (timeRange === '6h') limit = 80;
        else if (timeRange === '24h') limit = 150;
        else if (timeRange === '7d') limit = 300;

        const res = await readingsAPI.getReadings({ limit });
        const list = res.data?.readings || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        const normalized = list.map(r => ({
          ...r,
          temp_c: r.temperature ?? r.temp_c,
          sound_db_relative: r.sound_level ?? r.sound_db_relative,
          eutrophication_score: r.risk_score ?? r.eutrophication_score,
          oxygen_stress_index: r.oxygen_stress_index ?? 0
        }));
        setData(normalized.reverse());
      } catch (err) {
        console.error('Failed to load analytics readings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [timeRange]);

  // Compute summary stats for the active metric
  const stats = useMemo(() => {
    if (!data.length) return { min: 0, max: 0, avg: 0, current: 0 };
    const values = data
      .map((d) => Number(d[activePrimaryMetric]))
      .filter((v) => !isNaN(v));

    if (!values.length) return { min: 0, max: 0, avg: 0, current: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / values.length;
    const current = values[values.length - 1];

    return {
      min: min.toFixed(1),
      max: max.toFixed(1),
      avg: avg.toFixed(1),
      current: current.toFixed(1)
    };
  }, [data, activePrimaryMetric]);

  const metricLabels = {
    turbidity_ntu: { label: 'Turbidity', unit: 'NTU' },
    eutrophication_score: { label: 'Eutrophication Risk', unit: '/100' },
    temp_c: { label: 'Temperature', unit: '°C' },
    soil_moisture_pct: { label: 'Runoff Soil Moisture', unit: '%' },
    sound_db_relative: { label: 'Bioacoustic Sound', unit: 'dB-rel' },
    oxygen_stress_index: { label: 'Oxygen Stress Index', unit: '/100' }
  };

  const curr = metricLabels[activePrimaryMetric] || { label: activePrimaryMetric, unit: '' };

  return (
    <div className="space-y-6">
      {/* Metric & Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Telemetry</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-1">
            {stats.current}
            <span className="text-xs font-semibold text-lake-500">{curr.unit}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Latest station feed
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Average Mean</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-1">
            {stats.avg}
            <span className="text-xs font-semibold text-lake-500">{curr.unit}</span>
          </div>
          <div className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1 font-medium">
            <Activity className="w-3 h-3" /> Over {timeRange} window
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Window Peak</div>
          <div className="text-2xl font-black text-amber-500 mt-1 flex items-baseline gap-1">
            {stats.max}
            <span className="text-xs font-semibold text-lake-500">{curr.unit}</span>
          </div>
          <div className="text-[11px] text-amber-500/80 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Maximum surge
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Window Trough</div>
          <div className="text-2xl font-black text-lake-500 mt-1 flex items-baseline gap-1">
            {stats.min}
            <span className="text-xs font-semibold text-lake-500">{curr.unit}</span>
          </div>
          <div className="text-[11px] text-lake-500/80 mt-1 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" /> Baseline minimum
          </div>
        </div>
      </div>

      {/* Primary Interactive Telemetry Area Chart */}
      <ChartCard
        title={`${curr.label} Chronology`}
        data={data}
        metric={activePrimaryMetric}
        onMetricChange={setActivePrimaryMetric}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        availableMetrics={[
          'turbidity_ntu',
          'eutrophication_score',
          'temp_c',
          'soil_moisture_pct',
          'sound_db_relative',
          'oxygen_stress_index'
        ]}
        height={320}
      />

      {/* Dual Correlation Chart: Runoff + Turbidity vs Risk */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-aqua-500" />
              <h3 className="font-semibold text-slate-800 dark:text-white text-base">
                Multi-Parameter Ecological Correlation
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simultaneous overlay of Runoff Surge (%) vs Turbidity (NTU) vs Eutrophication Risk Index (/100)
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(val) => safeFormat(val, 'HH:mm', val)}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#f43f5e' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="p-3 bg-surface-900/95 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl text-white text-xs space-y-1">
                        <p className="text-slate-400 font-medium mb-1">
                          {safeFormat(label, 'MMM d, HH:mm:ss', label)}
                        </p>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 font-semibold">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span>{Number(entry.value).toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="turbidity_ntu"
                name="Turbidity (NTU)"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="soil_moisture_pct"
                name="Soil Runoff (%)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="eutrophication_score"
                name="Eutrophication Risk (0-100)"
                stroke="#f43f5e"
                strokeWidth={3}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Science & Ecological Algorithm Explanation Card */}
      <div className="glass-card p-6 bg-gradient-to-r from-lake-500/5 via-aqua-500/5 to-transparent border border-lake-500/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-lake-500/10 text-lake-500 dark:text-aqua-400 flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              Eutrophication Risk Engine & Diurnal Oxygen Modeling
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              AquaSense utilizes a multi-parameter weighted heuristic combined with diurnal acoustic bioactivity indicators. 
              High soil moisture directly correlates with lake-bank runoff delivering nitrogen and phosphorus compounds.
              Elevated water temperature accelerates algal reproduction, which spikes turbidity. 
              During subsequent bacterial biomass decomposition, dissolved oxygen plunges rapidly — detected by our acoustic sensor proxy 
              (attenuated sound levels due to reduced fish swimming activity and respiration distress) which triggers the automated aeration actuator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
