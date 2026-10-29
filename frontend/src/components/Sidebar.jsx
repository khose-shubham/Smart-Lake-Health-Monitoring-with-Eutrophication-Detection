import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  AlertTriangle,
  Sliders,
  FileText,
  Droplets,
  Moon,
  Sun,
  LogOut,
  Radio,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ socketConnected = false, alertCount = 0, isOpen = false, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggle } = useTheme();

  const links = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/analytics', label: 'Analytics', icon: LineChart },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle, badge: alertCount },
    { to: '/settings', label: 'Settings', icon: Sliders },
    { to: '/reports', label: 'Export & Reports', icon: FileText },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div>
          <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lake-600 via-lake-500 to-aqua-400 flex items-center justify-center text-white shadow-lg shadow-lake-500/30">
              <Droplets className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                Aqua<span className="text-gradient">Sense</span>
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Lake Health System
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-link group ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="flex-1">{link.label}</span>
                  {link.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-sm shadow-rose-500/40 animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Status */}
        <div className="p-4 space-y-3 border-t border-slate-200/60 dark:border-slate-800">
          {/* Hardware Connection Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Radio
                className={`w-4 h-4 ${
                  socketConnected
                    ? 'text-emerald-500 animate-pulse'
                    : 'text-amber-500'
                }`}
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {socketConnected ? 'Node Stream Active' : 'Connecting Node...'}
                </p>
                <p className="text-[10px] text-slate-400">ESP32 • 10s Telemetry</p>
              </div>
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                socketConnected ? 'bg-emerald-500 shadow-neon-green' : 'bg-amber-500'
              }`}
            />
          </div>

          {/* User Info Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-lake-500/10 dark:bg-lake-400/10 text-lake-500 dark:text-lake-400 flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase">
                {user?.username ? user.username[0] : <User className="w-4 h-4" />}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user?.username || 'Guest'}
                </p>
                <div className="flex items-center gap-1">
                  {isAdmin && <ShieldCheck className="w-3 h-3 text-lake-500" />}
                  <p className="text-[10px] uppercase font-semibold text-lake-600 dark:text-aqua-400">
                    {user?.role || 'viewer'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions: Theme & Logout */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggle}
                title={dark ? 'Switch to Light' : 'Switch to Dark'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
