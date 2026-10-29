import { useState } from 'react';
import { Wind, Power, Cpu, AlertCircle, CheckCircle } from 'lucide-react';
import { relayAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function RelayControl({
  relayState = false,
  mode = 'auto',
  reason = 'Optimal levels, pump idle',
  onRelayChange
}) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleToggleState = async (newState) => {
    if (!isAdmin) {
      setError('Admin privilege required to control aeration pump.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await relayAPI.setRelay({
        state: newState,
        mode: 'manual',
        reason: `Manual switch to ${newState ? 'ON' : 'OFF'} from dashboard`
      });
      if (onRelayChange) onRelayChange({ state: newState, mode: 'manual' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update relay');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = async (newMode) => {
    if (!isAdmin) {
      setError('Admin privilege required to alter pump operating mode.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await relayAPI.setRelay({
        mode: newMode,
        reason: `Operating mode set to ${newMode.toUpperCase()}`
      });
      if (onRelayChange) onRelayChange({ mode: newMode });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      {/* Decorative Glow */}
      {relayState && (
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-aqua-400/20 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl transition-all duration-300 ${
            relayState 
              ? 'bg-aqua-500/20 text-aqua-400 ring-2 ring-aqua-400/30' 
              : 'bg-slate-100 dark:bg-surface-900 text-slate-400'
          }`}>
            <Wind className={`w-5 h-5 ${relayState ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-base flex items-center gap-2">
              Aeration Actuator
              <span className={`w-2 h-2 rounded-full ${relayState ? 'bg-emerald-400 shadow-neon-green' : 'bg-slate-400'}`} />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              GPIO 18 Relay • Dissolved Oxygen Injection
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
          relayState
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/30'
            : 'bg-slate-100 text-slate-600 dark:bg-surface-900 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700'
        }`}>
          {relayState ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Power className="w-3.5 h-3.5 text-slate-400" />}
          {relayState ? 'RUNNING' : 'STANDBY'}
        </div>
      </div>

      {/* Mode and Trigger Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/50 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Control Mode</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize mt-0.5 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-lake-500" />
            {mode === 'auto' ? 'Automated Risk Driven' : 'Manual Override'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/50 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Trigger Logic</div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5 truncate" title={reason}>
            {reason || 'Standard setpoint'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        {/* Auto vs Manual Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-900 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleToggleMode('auto')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'auto'
                ? 'bg-white dark:bg-surface-800 text-lake-600 dark:text-aqua-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Auto Mode
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleToggleMode('manual')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'manual'
                ? 'bg-white dark:bg-surface-800 text-lake-600 dark:text-aqua-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Manual Override
          </button>
        </div>

        {/* Pump Switch Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || relayState}
            onClick={() => handleToggleState(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              relayState
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 active:scale-95'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            Engage Pump
          </button>

          <button
            type="button"
            disabled={loading || !relayState}
            onClick={() => handleToggleState(false)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              !relayState
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 active:scale-95'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            Shut Off
          </button>
        </div>
      </div>
    </div>
  );
}
