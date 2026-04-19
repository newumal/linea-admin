import { useEffect, useRef } from 'react';

/** ⌘K stub — Phase 3 DoD: palette opens; empty results OK. */
export function CommandPalette({ open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const el = ref.current?.querySelector('input');
    el?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Command palette"
      className="admin-cmd-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'rgba(26,26,26,0.2)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        className="admin-cmd-panel"
        style={{
          width: 'min(480px, 92vw)',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
          <input
            className="input"
            type="text"
            placeholder="Type a command…"
            style={{ border: 'none', padding: '8px 4px' }}
          />
        </div>
        <div style={{ padding: 20, color: 'var(--mute)', fontSize: 14 }}>
          No commands yet.
        </div>
      </div>
    </div>
  );
}
