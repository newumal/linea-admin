import { NavLink } from 'react-router-dom';
import { useRole } from '../auth/useRole.js';

function PinIcon({ pinned }) {
  return (
    <svg className="admin-pin-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {pinned ? (
        <>
          <path d="M14 3 10 7v4l-3 3v2h10v-2l-3-3V7l-0-4Z" />
          <path d="M12 16v5" />
        </>
      ) : (
        <>
          <path d="M14 3 10 7v4l-3 3v2h10v-2l-3-3V7l-0-4Z" />
          <path d="m5 5 14 14" />
        </>
      )}
    </svg>
  );
}

const NAV_ICONS = {
  '/dashboard': (
    <>
      <path d="M4 13h8V4H4v9Zm0 7h8v-5H4v5Zm10 0h6V11h-6v9Zm0-18v7h6V2h-6Z" />
    </>
  ),
  '/orders': (
    <>
      <path d="M6 7h12M6 12h12M6 17h8" />
      <path d="M8 3h8l2 2v16H6V5l2-2Z" />
    </>
  ),
  '/preorders': (
    <>
      <path d="M6 4h12v18H6V4Z" />
      <path d="M9 2v4M15 2v4M6 9h12" />
      <path d="M10 13h4M10 17h6" />
    </>
  ),
  '/products': (
    <>
      <path d="M7 7h10v10H7V7Z" />
      <path d="M5 7V5h14v2M5 17v2h14v-2" />
    </>
  ),
  '/inventory': (
    <>
      <path d="M4 7h16M6 7v12h12V7" />
      <path d="M8 4h8l2 3H6l2-3Z" />
      <path d="M10 11h4" />
    </>
  ),
  '/restock-requests': (
    <>
      <path d="M12 21s7-4.5 7-10a4 4 0 0 0-7-2 4 4 0 0 0-7 2c0 5.5 7 10 7 10Z" />
      <path d="M9.5 12.2 11 13.7l3.7-3.7" />
    </>
  ),
  '/categories': (
    <>
      <path d="M4 6h8v6H4V6Zm0 8h8v6H4v-6Zm10-8h6v14h-6V6Z" />
    </>
  ),
  '/brands': (
    <>
      <path d="M7 7h10v10H7V7Z" />
      <path d="M9 9h6v6H9V9Z" />
    </>
  ),
  '/catalog/options': (
    <>
      <path d="M4 7h16M6 11h12M8 15h8M10 19h4" />
    </>
  ),
  '/promos': (
    <>
      <path d="M4 10V7a2 2 0 0 1 2-2h3" />
      <path d="M20 14v3a2 2 0 0 1-2 2h-3" />
      <path d="M9 19 19 9" />
      <path d="M7.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M16.5 16.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </>
  ),
  '/reviews': (
    <>
      <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 20l1-6.1L3.2 9.4l6.1-.9L12 3Z" />
    </>
  ),
  '/customers': (
    <>
      <path d="M20 21v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </>
  ),
  '/cms': (
    <>
      <path d="M4 5h16v14H4V5Z" />
      <path d="M8 9h8M8 13h6" />
    </>
  ),
  '/analytics': (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l3-4 3 2 4-6" />
    </>
  ),
  '/audit': (
    <>
      <path d="M7 3h10v18H7V3Z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
  '/settings/integrations': (
    <>
      <path d="M14.5 3a4.5 4.5 0 0 0-4.3 5.8L3 16v3h3v-2h2v-2h2l1.2-1.2A4.5 4.5 0 1 0 14.5 3Z" />
      <circle cx="16" cy="8" r="1.1" />
    </>
  ),
  '/settings/users': (
    <>
      <path d="M16 21v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M17 11l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
    </>
  ),
};

function SidebarIcon({ to }) {
  const node = NAV_ICONS[to] ?? (
    <>
      <path d="M6 12h12" />
    </>
  );
  return (
    <svg className="admin-nav-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {node}
    </svg>
  );
}

export function Sidebar({ pinned = true, onTogglePinned }) {
  const { navItems } = useRole();

  return (
    <aside className={['admin-sidebar', pinned ? '' : 'admin-sidebar--collapsed'].filter(Boolean).join(' ')}>
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-head">
          <div className="admin-sidebar-title">
            <div className="admin-sidebar-logo">{pinned ? 'LINEA' : 'L'}</div>
            {pinned ? <div className="mono admin-sidebar-sub">ADMIN OPS</div> : null}
          </div>
          <button
            type="button"
            className="admin-pin-btn"
            onClick={onTogglePinned}
            aria-label={pinned ? 'Unpin sidebar (collapse)' : 'Pin sidebar (expand)'}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            <PinIcon pinned={pinned} />
          </button>
        </div>
      </div>
      <nav className="admin-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              ['admin-nav-link', isActive ? 'active' : ''].filter(Boolean).join(' ')
            }
          >
            <SidebarIcon to={item.to} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
