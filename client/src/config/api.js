// Production always talks to the Render API. Relative /api paths 404 on Vercel
// because this frontend is static files only.
const RENDER = 'https://waffle-stall.onrender.com';

export function apiUrl(path) {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const local = host === 'localhost' || host === '127.0.0.1';
  const fromEnv = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  const base = local ? '' : (fromEnv || RENDER);
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
