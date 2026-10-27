// Common utilities shared across platforms
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const clean = (s) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300);

export const norm = (s) => clean(s).toLowerCase().replace(/^(the|my)\s+/, '').replace(/[.!?]+$/, '');

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}
