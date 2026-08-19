/**
 * Single source of truth for the API base URL.
 *
 * This was previously duplicated across seven files, each with its own
 * fallback. They drifted, and a build made without VITE_API_URL shipped
 * `http://localhost:3000/api` to production, which meant the browser called the
 * visitor's own machine instead of the server.
 */
function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;

  // Opened straight from disk (file://), a relative path resolves against the
  // filesystem — e.g. file:///C:/Program Files/Git/api/departments — and every
  // request fails. Fall back to a local backend so a locally opened build is
  // merely useless rather than confusing.
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://localhost:3000/api';
  }

  // Served over http(s): a relative path keeps one build portable across
  // domain, IP and staging. nginx proxies /api in production; Vite proxies it
  // in development (see vite.config.ts).
  return '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Origin for socket.io — the API base with any trailing `/api` removed. */
export const WS_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

/** True when the page was opened from disk rather than served over http(s). */
export const IS_FILE_PROTOCOL =
  typeof window !== 'undefined' && window.location.protocol === 'file:';
