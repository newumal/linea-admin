import { NavLink } from 'react-router-dom';
import { useRole } from '../auth/useRole.js';

export function Sidebar() {
  const { navItems } = useRole();

  return (
    <aside
      className="admin-sidebar"
      style={{
        width: 'var(--admin-sidebar-w)',
        minHeight: '100vh',
        borderRight: '1px solid var(--line)',
        background: 'var(--surface)',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '0 20px 20px' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>
          Linea
        </div>
        <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
          Admin
        </div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              ['admin-nav-link', isActive ? 'active' : ''].filter(Boolean).join(' ')
            }
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 20px',
              fontSize: 13,
              color: isActive ? 'var(--ink)' : 'var(--mute)',
              background: isActive ? 'var(--bg-elev)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--ink)' : '2px solid transparent',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
