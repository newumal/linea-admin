import { useRole } from '../auth/useRole.js';

export function Topbar({ onOpenAi, onOpenCommand, onLogout }) {
  const { user } = useRole();

  return (
    <header
      className="admin-topbar"
      style={{
        height: 'var(--admin-topbar-h)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--admin-content-pad)',
        background: 'var(--surface)',
        gap: 16,
      }}
    >
      <div style={{ flex: 1, maxWidth: 360 }}>
        <input
          type="search"
          className="input"
          placeholder="Search (stub)"
          disabled
          style={{ padding: '10px 14px', fontSize: 13, opacity: 0.7 }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="btn sm ghost" onClick={onOpenCommand}>
          ⌘K
        </button>
        <button type="button" className="btn sm" onClick={onOpenAi}>
          AI ⌘J
        </button>
        <div className="hairline" style={{ width: 1, height: 24, background: 'var(--line)' }} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>
          {user?.role?.replace('_', ' ')}
        </span>
        <button type="button" className="btn sm ghost" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
