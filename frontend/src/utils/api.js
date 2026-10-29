import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lake_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lake_token');
      localStorage.removeItem('lake_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// ─── Readings ─────────────────────────────────────────────────────
export const readingsAPI = {
  getLatest: (device) => api.get('/readings/latest', { params: { device } }),
  getReadings: (params) => api.get('/readings', { params }),
  getStats: (params) => api.get('/readings/stats', { params }),
};

// ─── Alerts ───────────────────────────────────────────────────────
export const alertsAPI = {
  getAlerts: (params) => api.get('/alerts', { params }),
  getSummary: () => api.get('/alerts/summary'),
  updateAlert: (id, data) => api.patch(`/alerts/${id}`, data),
};

// ─── Thresholds ───────────────────────────────────────────────────
export const thresholdsAPI = {
  get: () => api.get('/thresholds'),
  update: (data) => api.put('/thresholds', data),
};

// ─── Relay ────────────────────────────────────────────────────────
export const relayAPI = {
  setRelay: (data) => api.post('/relay', data),
};

// ─── Devices ──────────────────────────────────────────────────────
export const devicesAPI = {
  getDevices: () => api.get('/devices'),
  updateDevice: (id, data) => api.put(`/devices/${id}`, data),
};

// ─── Export ───────────────────────────────────────────────────────
export const exportAPI = {
  csv: (params) => api.get('/export/csv', { params, responseType: 'blob' }),
  pdf: (params) => api.get('/export/pdf', { params, responseType: 'blob' }),
};

export default api;
