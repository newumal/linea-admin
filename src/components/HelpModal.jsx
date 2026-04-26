export function HelpModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      className="admin-dialog-backdrop"
      onClick={onClose}
    >
      <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif" style={{ textTransform: 'uppercase', letterSpacing: '-0.04em', fontWeight: 900 }}>
          Shortcuts
        </h3>
        <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
          <Row k="⌘K / Ctrl+K" v="Command palette" />
          <Row k="⌘J / Ctrl+J" v="AI drawer" />
          <Row k="?" v="Open this help" />
          <Row k="Sidebar pin" v="Collapse / expand nav" />
          <Row k="Density" v="Compact / comfortable tables" />
          <Row k="Theme" v="Light / dark" />
        </div>
        <div className="admin-dialog-actions" style={{ marginTop: 18 }}>
          <button type="button" className="btn sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span className="mono" style={{ color: 'var(--mute)' }}>
        {k}
      </span>
      <span style={{ textAlign: 'right' }}>{v}</span>
    </div>
  );
}

