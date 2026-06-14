import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { PaginationControls, TableCount } from '../../components/TableTools.jsx';

function fmt(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(ts);
  }
}

function JsonBlock({ label, value }) {
  if (value == null) {
    return (
      <div>
        <div className="field-label" style={{ marginBottom: 4 }}>{label}</div>
        <p className="admin-muted" style={{ margin: 0, fontSize: 12 }}>—</p>
      </div>
    );
  }
  return (
    <div>
      <div className="field-label" style={{ marginBottom: 4 }}>{label}</div>
      <pre
        className="mono"
        style={{
          margin: 0,
          padding: 10,
          fontSize: 11,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          overflow: 'auto',
          maxHeight: 220,
        }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function AuditRow({ row, expanded, onToggle }) {
  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={onToggle}>
        <td className="mono" style={{ fontSize: 12 }}>{fmt(row.createdAt)}</td>
        <td>{row.adminEmail || row.adminName || row.adminId?.slice(0, 8) || '—'}</td>
        <td className="mono">{row.action}</td>
        <td className="mono">{row.entity}</td>
        <td className="mono" style={{ fontSize: 11 }}>{row.entityId ? row.entityId.slice(0, 8) : '—'}</td>
        <td style={{ fontSize: 12, color: 'var(--mute)' }}>{expanded ? '▾' : '▸'}</td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={6} style={{ background: 'var(--bg-elev)', padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <JsonBlock label="Before" value={row.before} />
              <JsonBlock label="After" value={row.after} />
            </div>
            {row.ip || row.userAgent ? (
              <p className="admin-muted" style={{ margin: '12px 0 0', fontSize: 11 }}>
                {row.ip ? `IP ${row.ip}` : ''}{row.ip && row.userAgent ? ' · ' : ''}{row.userAgent || ''}
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    limit: 25,
    offset: 0,
  });

  const query = useMemo(() => {
    const q = { limit: String(filters.limit), offset: String(filters.offset) };
    if (filters.entity.trim()) q.entity = filters.entity.trim();
    if (filters.action.trim()) q.action = filters.action.trim();
    return q;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.auditLog(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /* eslint-disable react-hooks/set-state-in-effect -- load on filter change */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div>
      <h1 className="admin-page-title">Audit log</h1>
      <p className="admin-page-sub">Immutable trail of admin mutations — expand a row for before/after JSON.</p>

      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div>
            <label className="field-label" htmlFor="audit-entity">Entity</label>
            <input
              id="audit-entity"
              className="input"
              placeholder="product, order, user…"
              value={filters.entity}
              onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value, offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="audit-action">Action</label>
            <input
              id="audit-action"
              className="input"
              placeholder="product.update, admin_user.create…"
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value, offset: 0 }))}
            />
          </div>
        </div>
      </div>

      {err ? <p className="admin-err">{err}</p> : null}
      {!loading ? (
        <TableCount shown={items.length} total={total} offset={filters.offset} label="entries" />
      ) : (
        <p className="admin-muted">Loading…</p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>ID</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-muted">No audit entries match these filters.</td>
              </tr>
            ) : null}
            {items.map((row) => (
              <AuditRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
              />
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls
        total={total}
        limit={filters.limit}
        offset={filters.offset}
        onPage={(offset) => setFilters((f) => ({ ...f, offset }))}
        onLimit={(limit) => setFilters((f) => ({ ...f, limit, offset: 0 }))}
      />
    </div>
  );
}
