/**
 * Admin API base URL.
 * - Dev (default): '' → same origin; Vite proxies `/api` → linea-admin-api :3001
 * - Prod: set `VITE_ADMIN_API_BASE_URL=https://admin-api.example.com`
 */
export function apiUrl(path) {
  const base = (import.meta.env.VITE_ADMIN_API_BASE_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

const KEY_ACCESS = 'linea-admin-access';
const KEY_REFRESH = 'linea-admin-refresh';

export function getStoredTokens() {
  try {
    return {
      accessToken: localStorage.getItem(KEY_ACCESS),
      refreshToken: localStorage.getItem(KEY_REFRESH),
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

/** @param {{ accessToken?: string | null, refreshToken?: string | null }} t */
export function setStoredTokens(t) {
  if (t.accessToken) localStorage.setItem(KEY_ACCESS, t.accessToken);
  else localStorage.removeItem(KEY_ACCESS);
  if (t.refreshToken) localStorage.setItem(KEY_REFRESH, t.refreshToken);
  else localStorage.removeItem(KEY_REFRESH);
}

export function clearStoredTokens() {
  localStorage.removeItem(KEY_ACCESS);
  localStorage.removeItem(KEY_REFRESH);
}

async function parseJsonResponse(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const hint = data?.error?.details?.hint;
    const base = data?.error?.message || res.statusText;
    const err = new Error(hint ? `${base} — ${hint}` : base);
    err.status = res.status;
    err.body = data;
    err.details = data?.error?.details;
    throw err;
  }
  return data;
}

const inflight = { n: 0 };

function loadingDelta(d) {
  inflight.n = Math.max(0, inflight.n + d);
  window.dispatchEvent(new CustomEvent('admin:loading', { detail: { n: inflight.n } }));
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, auth?: boolean, headers?: Record<string, string> }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, auth = false, headers: extra = {} } = options;

  const run = (token) => {
    const isForm = body instanceof FormData;
    // For multipart, let the browser set Content-Type (with boundary).
    const headers = { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...extra };
    if (token) headers.Authorization = `Bearer ${token}`;
    let serialized;
    if (body !== undefined && body !== null) {
      serialized = isForm ? body : JSON.stringify(body);
    }
    return fetch(apiUrl(path), {
      method,
      headers,
      body: serialized,
    });
  };

  loadingDelta(+1);
  try {
    let token = auth ? getStoredTokens().accessToken : null;
    let res = await run(token);

    if (res.status === 401 && auth) {
      const { refreshToken } = getStoredTokens();
      if (refreshToken) {
        const r2 = await fetch(apiUrl('/api/v1/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const text = await r2.text();
        const data2 = text ? JSON.parse(text) : {};
        if (r2.ok && data2.accessToken) {
          setStoredTokens({
            accessToken: data2.accessToken,
            refreshToken: data2.refreshToken || refreshToken,
          });
          res = await run(data2.accessToken);
        }
      }
    }

    return parseJsonResponse(res);
  } finally {
    loadingDelta(-1);
  }
}
