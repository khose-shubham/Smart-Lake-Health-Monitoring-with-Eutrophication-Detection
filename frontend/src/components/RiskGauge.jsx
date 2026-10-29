import { useMemo } from 'react';

/**
 * Large risk score gauge — the centrepiece of the overview page.
 * Displays 0-100 score with animated gradient ring.
 */
export default function RiskGauge({
  score = 0,
  stage = 0,
  oxygenStress = 0,
  label = 'Eutrophication Risk Score',
  subtitle
}) {
  const getColor = (s) => {
    if (s >= 60) return { stroke: 'url(#riskGradientCrit)', glow: 'shadow-neon-red', text: 'text-rose-500', badge: 'badge-critical' };
    if (s >= 30) return { stroke: 'url(#riskGradientWarn)', glow: 'shadow-neon-yellow', text: 'text-amber-500', badge: 'badge-warning' };
    return { stroke: 'url(#riskGradientSafe)', glow: 'shadow-neon-green', text: 'text-emerald-500', badge: 'badge-safe' };
  };

  const color = getColor(score);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const riskLabel = score >= 60 ? 'CRITICAL' : score >= 30 ? 'WARNING' : 'SAFE';

  return (
    <div className="glass-card p-6 flex flex-col items-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        {label}
      </p>

      <div className="gauge-ring relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="riskGradientSafe" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="riskGradientWarn" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="riskGradientCrit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-slate-200 dark:text-slate-700"
          />
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${color.text}`}>
            {score.toFixed(0)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">/100</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 w-full">
        <div className="flex items-center justify-center gap-2">
          <span className={color.badge}>
            <span className={`w-2 h-2 rounded-full ${
              riskLabel === 'SAFE' ? 'bg-emerald-500' :
              riskLabel === 'WARNING' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
            }`}></span>
            {riskLabel}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300">
            Stage {stage}
          </span>
        </div>

        {/* Oxygen Stress Metric */}
        <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Oxygen Stress Index</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {Number(oxygenStress).toFixed(1)} / 100
          </span>
        </div>

        {subtitle && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center max-w-[200px]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
