/** Phase 8 — SSE chat. Shell: empty panel. */
export function AiDrawer({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="AI assistant"
      className="admin-ai-drawer-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(26,26,26,0.12)',
      }}
      onClick={onClose}
    >
      <aside
        className="admin-ai-drawer"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 'min(420px, 100vw)',
          height: '100%',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          boxShadow: 'var(--shadow-lg)',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="mono" style={{ fontSize: 11 }}>
            Assistant
          </h2>
          <button type="button" className="btn sm ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p style={{ marginTop: 24, color: 'var(--mute)', fontSize: 14, lineHeight: 1.5 }}>
          AI analytics chat ships in Phase 8. Use ⌘J to toggle this drawer.
        </p>
      </aside>
    </div>
  );
}
