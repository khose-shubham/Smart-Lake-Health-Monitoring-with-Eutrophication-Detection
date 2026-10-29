import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { alertsAPI } from '../utils/api';
import AlertBadge from '../components/AlertBadge';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Check,
  RotateCw,
  BellRing,
  AlertCircle
} from 'lucide-react';
import { safeFormat } from '../utils/formatDate';

export default function Alerts() {
  const { latestAlert: socketAlert } = useOutletContext() || {};
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('unresolved');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch alerts
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filterStatus === 'unresolved') params.resolved = false;
      if (filterStatus === 'resolved') params.resolved = true;
      if (filterSeverity !== 'all') params.severity = filterSeverity;

      const res = await alertsAPI.getAlerts(params);
      const list = res.data?.alerts || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setAlerts(list);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterSeverity, filterStatus]);

  // Prepend incoming live alert from socket
  useEffect(() => {
    if (socketAlert) {
      setAlerts((prev) => {
        // avoid duplicates if same ID
        if (prev.some((a) => (a._id || a.id) === (socketAlert._id || socketAlert.id))) {
          return prev;
        }
        return [socketAlert, ...prev];
      });
    }
  }, [socketAlert]);

  // Acknowledge alert handler
  const handleAcknowledge = async (id) => {
    setUpdatingId(id);
    try {
      await alertsAPI.updateAlert(id, { acknowledged: true });
      setAlerts((prev) =>
        prev.map((a) =>
          (a._id || a.id) === id ? { ...a, acknowledged: true } : a
        )
      );
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Resolve alert handler
  const handleResolve = async (id) => {
    setUpdatingId(id);
    try {
      await alertsAPI.updateAlert(id, { resolved: true });
      if (filterStatus === 'unresolved') {
        setAlerts((prev) => prev.filter((a) => (a._id || a.id) !== id));
      } else {
        setAlerts((prev) =>
          prev.map((a) =>
            (a._id || a.id) === id ? { ...a, resolved: true } : a
          )
        );
      }
    } catch (err) {
      console.error('Failed to resolve alert', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Compute counts
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const unackCount = alerts.filter((a) => !a.acknowledged && !a.resolved).length;

  // Filtered by text search
  const filteredAlerts = alerts.filter((a) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      a.title?.toLowerCase().includes(term) ||
      a.message?.toLowerCase().includes(term) ||
      a.parameter?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Alert KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Critical Breaches</div>
            <div className="text-2xl font-black text-rose-500 mt-1">{criticalCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
            <AlertCircle className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Warning Thresholds</div>
            <div className="text-2xl font-black text-amber-500 mt-1">{warningCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unacknowledged</div>
            <div className="text-2xl font-black text-lake-500 mt-1">{unackCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-lake-500/10 text-lake-500">
            <BellRing className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Incidents</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {alerts.length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts by title, sensor, or message..."
            className="input-field pl-10"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-surface-900 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterStatus('unresolved')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'unresolved'
                  ? 'bg-white dark:bg-surface-800 text-lake-600 dark:text-aqua-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('resolved')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'resolved'
                  ? 'bg-white dark:bg-surface-800 text-lake-600 dark:text-aqua-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Resolved
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-surface-800 text-lake-600 dark:text-aqua-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warning Only</option>
            <option value="info">Info Only</option>
          </select>

          <button
            type="button"
            onClick={fetchAlerts}
            className="p-2 rounded-xl bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Refresh alerts"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts Table / Feed */}
      <div className="glass-card overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No matching alerts found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              All sensors and ecological indicators are healthy.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Timestamp</th>
                  <th>Incident</th>
                  <th>Telemetry Value</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const id = alert._id || alert.id;
                  const isUpdating = updatingId === id;

                  return (
                    <tr key={id}>
                      <td>
                        <AlertBadge severity={alert.severity} />
                      </td>
                      <td className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {safeFormat(alert.createdAt || alert.timestamp, 'MMM d, HH:mm:ss', 'Just now')}
                      </td>
                      <td>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {alert.title || alert.type}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 max-w-md line-clamp-1">
                          {alert.message}
                        </div>
                      </td>
                      <td className="text-xs">
                        {alert.value !== undefined ? (
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {Number(alert.value).toFixed(1)} {alert.unit || ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {alert.threshold !== undefined && (
                          <span className="text-slate-400 text-[11px] ml-1">
                            (setpoint: {alert.threshold})
                          </span>
                        )}
                      </td>
                      <td>
                        {alert.resolved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Resolved
                          </span>
                        ) : alert.acknowledged ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-lake-600 dark:text-aqua-400">
                            <Clock className="w-3.5 h-3.5" /> Acknowledged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" /> Unacknowledged
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!alert.acknowledged && !alert.resolved && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleAcknowledge(id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-lake-50 dark:bg-lake-950/60 text-lake-600 dark:text-aqua-400 hover:bg-lake-100 transition-colors"
                            >
                              Ack
                            </button>
                          )}
                          {!alert.resolved && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleResolve(id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
