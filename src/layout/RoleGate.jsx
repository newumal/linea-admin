import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useRole } from '../auth/useRole.js';

/** Redirects to dashboard when the path is not allowed for the current role. */
export function RoleGate() {
  const { pathname } = useLocation();
  const { canSeePath } = useRole();

  if (!canSeePath(pathname)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
