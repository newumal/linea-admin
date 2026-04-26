export function SortButton({ label, column, sort, onSort }) {
  const active = sort?.key === column;
  const suffix = active ? (sort.dir === 'asc' ? ' asc' : ' desc') : '';
  return (
    <button
      type="button"
      className="admin-th-button"
      onClick={() =>
        onSort((s) => ({
          key: column,
          dir: s.key === column && s.dir === 'asc' ? 'desc' : 'asc',
        }))
      }
    >
      {label}
      {suffix}
    </button>
  );
}

export function TableCount({ shown, total, offset = 0, label = 'rows' }) {
  const start = total > 0 ? offset + 1 : 0;
  const end = Math.min(offset + shown, total);
  return (
    <div className="admin-table-meta">
      <span>
        Showing <strong>{start}-{end}</strong> of <strong>{total}</strong> {label}
      </span>
    </div>
  );
}

export function PaginationControls({ limit, offset, total, onPage, onLimit }) {
  const safeLimit = Number(limit) || 50;
  const safeOffset = Number(offset) || 0;
  const canPrev = safeOffset > 0;
  const canNext = safeOffset + safeLimit < total;
  return (
    <div className="admin-pagination">
      <button type="button" className="btn ghost sm" disabled={!canPrev} onClick={() => onPage(Math.max(0, safeOffset - safeLimit))}>
        Prev
      </button>
      <button type="button" className="btn ghost sm" disabled={!canNext} onClick={() => onPage(safeOffset + safeLimit)}>
        Next
      </button>
      <label className="admin-page-size">
        <span className="field-label">Rows</span>
        <select className="input" value={safeLimit} onChange={(e) => onLimit(Number(e.target.value))}>
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function InfoPanel({ title, children }) {
  return (
    <div className="admin-info-panel">
      <div className="caps">{title}</div>
      <div>{children}</div>
    </div>
  );
}
