import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Droplets,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    username: '',
    email: 'admin@lakemonitor.com',
    password: 'admin123',
    role: 'admin'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await register(form.username, form.email, form.password, form.role);
      } else {
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Authentication failed. Please verify your credentials or server connectivity.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillQuick = (email, password, role = 'admin') => {
    setForm({
      ...form,
      email,
      password,
      role
    });
    setIsRegister(false);
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 bg-mesh flex items-center justify-center p-4">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-lake-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-aqua-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-card p-8 relative z-10 shadow-2xl border border-white/40 dark:border-slate-800">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-lake-600 via-lake-500 to-aqua-400 flex items-center justify-center text-white mx-auto shadow-lg shadow-lake-500/30 mb-3">
            <Droplets className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Aqua<span className="text-gradient">Sense</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Smart Lake Health & Eutrophication Actuator Gateway
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Full Name / Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. Dr. Jane Smith"
                  className="input-field pl-10"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="operator@lake.local"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="input-field pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                System Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input-field"
              >
                <option value="admin">Administrator (Full Actuator & Config)</option>
                <option value="viewer">Viewer (Read-only Telemetry Access)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 mt-2"
          >
            {loading ? (
              'Authenticating...'
            ) : (
              <>
                <span>{isRegister ? 'Create Account' : 'Sign In to Station'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Login Pills */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
            Quick College Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillQuick('admin@lakemonitor.com', 'admin123', 'admin')}
              className="p-2 rounded-xl bg-lake-50 dark:bg-lake-950/40 border border-lake-200/60 dark:border-lake-800 text-left hover:border-lake-400 transition-all text-xs"
            >
              <div className="font-bold text-lake-600 dark:text-aqua-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Demo Admin
              </div>
              <div className="text-[10px] text-slate-400">admin@lakemonitor.com</div>
            </button>

            <button
              type="button"
              onClick={() => fillQuick('viewer@lakemonitor.com', 'viewer123', 'viewer')}
              className="p-2 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200/60 dark:border-slate-700 text-left hover:border-slate-400 transition-all text-xs"
            >
              <div className="font-bold text-slate-700 dark:text-slate-300">
                Demo Viewer
              </div>
              <div className="text-[10px] text-slate-400">viewer@lakemonitor.com</div>
            </button>
          </div>
        </div>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs text-slate-500">
          {isRegister ? (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="font-bold text-lake-500 hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need a new account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="font-bold text-lake-500 hover:underline"
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
