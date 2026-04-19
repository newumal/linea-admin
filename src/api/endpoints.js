/** @param {string} path */
export function pathWithQuery(path, query) {
  if (!query || Object.keys(query).length === 0) return path;
  const q = new URLSearchParams(query);
  return `${path}?${q}`;
}

export const AUTH = {
  login: '/api/v1/auth/login',
  google: '/api/v1/auth/google',
  refresh: '/api/v1/auth/refresh',
  logout: '/api/v1/auth/logout',
  me: '/api/v1/auth/me',
};
