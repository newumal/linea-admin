import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { navItemsForRole } from './navConfig.js';

/**
 * @param {string[]} [anyOf]
 */
export function useRole(anyOf) {
  const user = useSelector((s) => s.auth.user);
  const role = user?.role ?? null;

  const hasRole = useMemo(
    () => (roles) => Boolean(role && roles.includes(role)),
    [role],
  );

  const allowed = useMemo(() => {
    if (!anyOf?.length) return true;
    return hasRole(anyOf);
  }, [anyOf, hasRole]);

  const navItems = useMemo(() => navItemsForRole(role ?? undefined), [role]);

  const canSeePath = useMemo(() => {
    const items = navItemsForRole(role ?? undefined);
    return (path) => {
      const n = path.replace(/\/$/, '') || '/';
      return items.some((item) => n === item.to || n.startsWith(`${item.to}/`));
    };
  }, [role]);

  return { role, user, hasRole, allowed, navItems, canSeePath };
}
