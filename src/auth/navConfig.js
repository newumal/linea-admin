/** Keep aligned with `linea-admin-api` `STAFF_ROLES` / plan RBAC. */
export const STAFF_ROLES = ['super_admin', 'admin', 'ops', 'merchandiser', 'marketer', 'analyst'];

/** Matches `ORDER_OPS_ROLES` on admin-api — orders/pre-orders mutations. */
export const ORDER_OPS_ROLES = ['super_admin', 'admin', 'ops'];

/** Matches `MERCHANDISER_ROLES` on admin-api — catalog / inventory writes. */
export const MERCHANDISER_ROLES = ['super_admin', 'admin', 'merchandiser'];

/** Matches `RESTOCK_ROLES` on admin-api — back-in-stock request queue. */
export const RESTOCK_ROLES = ['super_admin', 'admin', 'ops', 'merchandiser'];

/** Matches `MARKETER_ROLES` on admin-api — promos, reviews, CMS writes. */
export const MARKETER_ROLES = ['super_admin', 'admin', 'marketer'];

/** Matches `CMS_WRITE_ROLES` on admin-api — CMS block writes. */
export const CMS_WRITE_ROLES = ['super_admin', 'admin', 'merchandiser', 'marketer'];

/** Customer tier updates — admin-api `PATCH .../tier`. */
export const CUSTOMER_ADMIN_ROLES = ['super_admin', 'admin'];

/** @type {{ to: string, label: string, roles: string[] }[]} */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: STAFF_ROLES },
  { to: '/orders', label: 'Orders', roles: ['super_admin', 'admin', 'ops'] },
  { to: '/preorders', label: 'Pre-orders', roles: ['super_admin', 'admin', 'ops'] },
  { to: '/products', label: 'Products', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/inventory', label: 'Inventory', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/restock-requests', label: 'Restock alerts', roles: RESTOCK_ROLES },
  { to: '/categories', label: 'Categories', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/brands', label: 'Brands', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/catalog/options', label: 'Sizes & colors', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/promos', label: 'Promos', roles: ['super_admin', 'admin', 'marketer'] },
  { to: '/reviews', label: 'Reviews', roles: ['super_admin', 'admin', 'marketer'] },
  { to: '/customers', label: 'Customers', roles: ['super_admin', 'admin', 'ops'] },
  { to: '/cms', label: 'CMS', roles: ['super_admin', 'admin', 'merchandiser', 'marketer'] },
  { to: '/analytics', label: 'Analytics', roles: STAFF_ROLES },
  { to: '/audit', label: 'Audit log', roles: ['super_admin', 'admin'] },
  { to: '/settings/users', label: 'Users', roles: ['super_admin'] },
  { to: '/settings/integrations', label: 'API tokens', roles: ['super_admin', 'admin'] },
];

/** @param {string | undefined} role */
export function navItemsForRole(role) {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
