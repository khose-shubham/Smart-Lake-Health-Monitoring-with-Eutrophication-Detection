import { format } from 'date-fns';

export function safeFormat(dateVal, formatStr = 'MMM d, HH:mm:ss', fallback = '—') {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}
