import { useRole } from '../auth/useRole.js';

export function Topbar({
  onOpenAi,
  onOpenCommand,
  onOpenHelp,
  onToggleTheme,
  onToggleDensity,
  theme,
  density,
  onLogout,
}) {
  const { user } = useRole();

  return (
    <header className="admin-topbar">
      <div style={{ flex: 1, maxWidth: 360 }}>
        <input
          type="search"
          className="input"
          placeholder="Search ops"
          disabled
          style={{ padding: '10px 14px', fontSize: 13, opacity: 0.7 }}
        />
      </div>
      <div className="admin-topbar-actions">
        <button type="button" className="btn sm ghost" onClick={onOpenCommand}>
          ⌘K
        </button>
        <button type="button" className="btn sm" onClick={onOpenAi}>
          AI ⌘J
        </button>
        <button
          type="button"
          className="btn sm ghost"
          onClick={onToggleDensity}
          title="Toggle density"
        >
          {density === 'compact' ? 'Compact' : 'Comfort'}
        </button>
        <button
          type="button"
          className="btn sm ghost"
          onClick={onToggleTheme}
          title="Toggle theme"
        >
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
        <button type="button" className="btn sm ghost" onClick={onOpenHelp} title="Shortcuts (?)">
          ?
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
