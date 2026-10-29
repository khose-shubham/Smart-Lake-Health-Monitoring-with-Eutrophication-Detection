import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function AlertBadge({ severity = 'safe', count, label, className = '' }) {
  const norm = String(severity).toLowerCase();

  const config = {
    safe: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
      defaultLabel: 'Optimal'
    },
    warning: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
      icon: AlertTriangle,
      defaultLabel: 'Warning'
    },
    critical: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-500 animate-ping',
      icon: AlertCircle,
      defaultLabel: 'Critical'
    },
    info: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/20',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-500/30',
      dot: 'bg-sky-500',
      icon: Info,
      defaultLabel: 'Information'
    }
  };

  const current = config[norm] || config.info;
  const Icon = current.icon;
  const displayText = label || current.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {norm === 'critical' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot.replace('animate-ping', '')}`} />
      </span>
      <Icon className="w-3.5 h-3.5" />
      <span>{displayText}</span>
      {count !== undefined && count !== null && (
        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 text-[10px]">
          {count}
        </span>
      )}
    </span>
  );
}
