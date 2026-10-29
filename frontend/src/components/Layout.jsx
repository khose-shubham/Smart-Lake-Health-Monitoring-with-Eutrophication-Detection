import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Bell, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { connected, latestReading, latestAlert } = useSocket();

  // Determine current page title
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return { title: 'Lake Health Overview', subtitle: 'Live telemetry, eutrophication risk index & actuator status' };
      case '/analytics':
        return { title: 'Telemetry Analytics', subtitle: 'Historical sensor trends, correlation analysis & anomalies' };
      case '/alerts':
        return { title: 'Ecological Alerts', subtitle: 'Real-time threshold breaches & eutrophication hazard warnings' };
      case '/settings':
        return { title: 'System Configuration', subtitle: 'Calibrate sensor thresholds, risk weights & device params' };
      case '/reports':
        return { title: 'Reports & Export', subtitle: 'Generate compliance reports, download CSV data & PDF audits' };
      default:
        return { title: 'AquaSense Dashboard', subtitle: 'Smart Lake Eutrophication Management' };
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 bg-mesh text-slate-800 dark:text-slate-100 flex flex-col antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        socketConnected={connected}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-20 px-4 sm:px-8 bg-white/70 dark:bg-surface-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center gap-3">
            {/* Live Socket Status Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-surface-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
              {connected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-700 dark:text-slate-300">Live Gateway</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400">Reconnecting...</span>
                </>
              )}
            </div>

            {/* Notification Indicator */}
            <div className="relative">
              <button
                type="button"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {latestAlert && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Real-time Alert Banner if critical alert triggered recently */}
        {latestAlert && latestAlert.severity === 'critical' && (
          <div className="bg-rose-500 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-rose-700 animate-pulse">ALERT</span>
              <span>{latestAlert.title || 'Critical Lake Anomaly'}: {latestAlert.message}</span>
            </div>
            <span className="text-[11px] opacity-80">Just now</span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet context={{ latestReading, latestAlert, connected }} />
        </main>
      </div>
    </div>
  );
}
