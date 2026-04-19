/** Keep aligned with `linea-admin-api` `STAFF_ROLES` / plan RBAC. */
export const STAFF_ROLES = ['super_admin', 'admin', 'ops', 'merchandiser', 'marketer', 'analyst'];

/** Matches `ORDER_OPS_ROLES` on admin-api — orders/pre-orders mutations. */
export const ORDER_OPS_ROLES = ['super_admin', 'admin', 'ops'];

/** @type {{ to: string, label: string, roles: string[] }[]} */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: STAFF_ROLES },
  { to: '/orders', label: 'Orders', roles: ['super_admin', 'admin', 'ops'] },
  { to: '/preorders', label: 'Pre-orders', roles: ['super_admin', 'admin', 'ops'] },
  { to: '/products', label: 'Products', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/inventory', label: 'Inventory', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/categories', label: 'Categories', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/brands', label: 'Brands', roles: ['super_admin', 'admin', 'merchandiser'] },
  { to: '/promos', label: 'Promos', roles: ['super_admin', 'admin', 'marketer'] },
  { to: '/reviews', label: 'Reviews', roles: ['super_admin', 'admin', 'marketer'] },
  { to: '/customers', label: 'Customers', roles: ['super_admin', 'admin', 'ops'] },
  { to: '/cms', label: 'CMS', roles: ['super_admin', 'admin', 'merchandiser', 'marketer'] },
  { to: '/analytics', label: 'Analytics', roles: STAFF_ROLES },
  { to: '/audit', label: 'Audit log', roles: ['super_admin', 'admin'] },
  { to: '/settings/users', label: 'Users', roles: ['super_admin'] },
];

/** @param {string | undefined} role */
export function navItemsForRole(role) {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
