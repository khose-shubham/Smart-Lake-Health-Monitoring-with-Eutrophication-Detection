import React, { useMemo } from 'react';

/**
 * Circular gauge component for sensor values.
 * Shows value, label, unit, and color-coded ring based on status.
 */
export default function GaugeCard({ label, value, unit, min = 0, max = 100, status = 'safe', icon, subtitle }) {
  const colors = {
    safe:     { ring: '#10b981', bg: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-500' },
    warning:  { ring: '#f59e0b', bg: 'from-amber-500/10 to-amber-500/5', text: 'text-amber-500' },
    critical: { ring: '#ef4444', bg: 'from-red-500/10 to-red-500/5', text: 'text-red-500' },
  };

  const color = colors[status] || colors.safe;

  const percentage = useMemo(() => {
    const clamped = Math.min(Math.max(value, min), max);
    return ((clamped - min) / (max - min)) * 100;
  }, [value, min, max]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${color.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {subtitle && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className={`text-lg ${color.text}`}>
          {typeof icon === 'function' ? React.createElement(icon, { className: 'w-5 h-5' }) : icon}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Gauge Ring */}
        <div className="gauge-ring shrink-0">
          <svg width="80" height="80" viewBox="0 0 120 120">
            {/* Background track */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-200 dark:text-slate-700"
            />
            {/* Value arc */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={color.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-slate-800 dark:text-white">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{unit}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex-1 flex flex-col items-end">
          <span className={`badge-${status}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === 'safe' ? 'bg-emerald-500' : 
              status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
            }`}></span>
            {status.toUpperCase()}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {percentage.toFixed(0)}% of range
          </span>
        </div>
      </div>
    </div>
  );
}
