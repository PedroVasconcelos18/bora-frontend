// API client — all requests use credentials:'include' so httpOnly cookies are sent automatically.
// This is required for the cross-subdomain httpOnly cookie auth pattern (D-09).
//
// Silent-refresh wrapper (GAP 1 fix):
// On a 401 response for any non-auth path, the wrapper fires exactly one POST /auth/refresh
// (credentials:'include', no body). If the refresh succeeds (2xx), the original request is
// replayed once and that response is returned. If the refresh fails, the original 401 response
// is returned unchanged so the caller (e.g. __root.tsx boot effect) can clear the session.
//
// Auth-exclusion list — never refresh-retry these paths (matched by exact segment prefix):
//   /auth/refresh  — prevents infinite loop
//   /auth/login    — 401 means wrong credentials, NOT expired access_token
//   /auth/signup   — same rationale as /auth/login
//
// Concurrent-401 deduplication: a single module-level in-flight Promise is shared across
// concurrent callers so only one POST /auth/refresh fires per real 401 event.
//
// Security (D-07 / D-11): the wrapper never reads document.cookie or stores any token in
// localStorage/sessionStorage — httpOnly cookies are attached automatically by the browser
// via credentials:'include'.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Paths that must never be refresh-retried.
const REFRESH_EXCLUDED_PATHS = ['/auth/refresh', '/auth/login', '/auth/signup'];

/** Returns true when `path` is on the auth-exclusion list. */
function isExcluded(path: string): boolean {
  return REFRESH_EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded));
}

// Module-level in-flight refresh promise. Shared across concurrent 401s so exactly one
// POST /auth/refresh fires per expiry event regardless of how many requests are in flight.
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Attempt a single token refresh via POST /auth/refresh.
 * Returns true when the refresh succeeded (2xx), false otherwise.
 * Deduplicates concurrent callers via `refreshInFlight`.
 */
function attemptRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Core fetch helper with single-attempt refresh-and-retry on 401.
 *
 * @param path   - API path (e.g. '/auth/me', '/challenges')
 * @param init   - Fetch options (method, headers, body, credentials already set)
 * @returns The final Response (either the original or the replayed one after refresh)
 */
async function fetchWithRefresh(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, init);

  if (res.status !== 401 || isExcluded(path)) {
    // Not a 401, or this path must never be refresh-retried — return as-is.
    return res;
  }

  // 401 on a non-excluded path: attempt one token refresh.
  const refreshed = await attemptRefresh();

  if (!refreshed) {
    // Refresh failed — return the original 401 so the caller can clear the session.
    return res;
  }

  // Refresh succeeded — replay the original request exactly once (no recursion).
  return fetch(`${API_URL}${path}`, init);
}

export const apiClient = {
  get: (path: string): Promise<Response> =>
    fetchWithRefresh(path, {
      credentials: 'include', // sends httpOnly cookies on every request
      headers: { 'Content-Type': 'application/json' },
    }),

  post: (path: string, body: unknown): Promise<Response> =>
    fetchWithRefresh(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  put: (path: string, body: unknown): Promise<Response> =>
    fetchWithRefresh(path, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  patch: (path: string, body: unknown): Promise<Response> =>
    fetchWithRefresh(path, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  delete: (path: string): Promise<Response> =>
    fetchWithRefresh(path, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }),
};

/**
 * adminClient — a distinct, cookie-free client for the env-secret-gated
 * /admin refund queue (D-11). Sends the operator's secret as an
 * `X-Admin-Secret` header, NEVER as a URL query param (RESEARCH.md A5 — a
 * query param would land in server access logs). Deliberately does NOT go
 * through `fetchWithRefresh`: the admin gate is a shared secret, not the
 * user's JWT/cookie session, so the 401-refresh-and-retry logic (which
 * assumes an httpOnly cookie session) does not apply here.
 */
export function createAdminClient(secret: string) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Secret': secret,
  };

  return {
    get: (path: string): Promise<Response> => fetch(`${API_URL}${path}`, { headers }),
    patch: (path: string, body: unknown): Promise<Response> =>
      fetch(`${API_URL}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) }),
  };
}
