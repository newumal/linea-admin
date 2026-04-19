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

export const ADMIN = {
  orders: (query) => pathWithQuery('/api/v1/admin/orders', query),
  order: (id) => `/api/v1/admin/orders/${id}`,
  orderStatus: (id) => `/api/v1/admin/orders/${id}/status`,
  orderFulfill: (id) => `/api/v1/admin/orders/${id}/fulfill`,
  orderRefund: (id) => `/api/v1/admin/orders/${id}/refund`,
  orderCancel: (id) => `/api/v1/admin/orders/${id}/cancel`,
  ordersBulkStatus: () => '/api/v1/admin/orders/bulk/status',
  preorders: () => '/api/v1/admin/preorders',
  preorderStatus: (id) => `/api/v1/admin/preorders/${id}/status`,
  preorderCapture: (id) => `/api/v1/admin/preorders/${id}/capture-balance`,
};
