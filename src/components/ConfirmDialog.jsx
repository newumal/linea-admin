export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="admin-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title ? <h3>{title}</h3> : null}
        {children}
        <div className="admin-dialog-actions">
          <button type="button" className="btn ghost sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn sm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
