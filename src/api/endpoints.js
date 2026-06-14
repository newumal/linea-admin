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
  preorders: (query) => pathWithQuery('/api/v1/admin/preorders', query),
  preorderStatus: (id) => `/api/v1/admin/preorders/${id}/status`,
  preorderCapture: (id) => `/api/v1/admin/preorders/${id}/capture-balance`,

  products: (query) => pathWithQuery('/api/v1/admin/products', query),
  product: (id) => `/api/v1/admin/products/${id}`,
  productVariants: (productId) => `/api/v1/admin/products/${productId}/variants`,
  productVariant: (variantId) => `/api/v1/admin/products/variants/${variantId}`,
  productImages: (productId) => `/api/v1/admin/products/${productId}/images`,
  productImageUpload: (productId) => `/api/v1/admin/products/${productId}/images/upload`,
  productImageUploadBulk: (productId) => `/api/v1/admin/products/${productId}/images/upload-bulk`,
  productImage: (imageId) => `/api/v1/admin/products/images/${imageId}`,

  inventoryLowStock: (query) => pathWithQuery('/api/v1/admin/inventory/low-stock', query),
  inventoryVariantStock: (variantId) => `/api/v1/admin/inventory/variants/${variantId}/stock`,

  categories: (query) => pathWithQuery('/api/v1/admin/categories', query),
  category: (id) => `/api/v1/admin/categories/${id}`,

  brands: (query) => pathWithQuery('/api/v1/admin/brands', query),
  brand: (id) => `/api/v1/admin/brands/${id}`,

  catalogSizes: (query) => pathWithQuery('/api/v1/admin/catalog/sizes', query),
  catalogSize: (id) => `/api/v1/admin/catalog/sizes/${id}`,
  catalogColors: (query) => pathWithQuery('/api/v1/admin/catalog/colors', query),
  catalogColor: (id) => `/api/v1/admin/catalog/colors/${id}`,

  restockSummary: () => '/api/v1/admin/restock/summary',
  restockRequests: (query) => pathWithQuery('/api/v1/admin/restock', query),
  restockRequest: (id) => `/api/v1/admin/restock/${id}`,

  integrationTokens: () => '/api/v1/admin/integration-tokens',
  integrationToken: (id) => `/api/v1/admin/integration-tokens/${id}`,

  promos: (query) => pathWithQuery('/api/v1/admin/promos', query),
  promo: (id) => `/api/v1/admin/promos/${id}`,
  promoRedemptions: (query) => pathWithQuery('/api/v1/admin/promos/redemptions', query),

  reviewsPending: (query) => pathWithQuery('/api/v1/admin/reviews/pending', query),
  review: (id) => `/api/v1/admin/reviews/${id}`,
  reviewApprove: (id) => `/api/v1/admin/reviews/${id}/approve`,
  reviewReject: (id) => `/api/v1/admin/reviews/${id}/reject`,

  cms: (query) => pathWithQuery('/api/v1/admin/cms', query),
  cmsBlock: (id) => `/api/v1/admin/cms/${id}`,

  customers: (query) => pathWithQuery('/api/v1/admin/customers', query),
  customer: (id) => `/api/v1/admin/customers/${id}`,
  customerTier: (id) => `/api/v1/admin/customers/${id}/tier`,
  customerImpersonate: (id) => `/api/v1/admin/customers/${id}/impersonate`,
};
