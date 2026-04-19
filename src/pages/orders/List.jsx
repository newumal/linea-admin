import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ORDER_OPS_ROLES } from '../../auth/navConfig.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';

const LS_PRESETS = 'linea-admin-order-filter-presets';

const ORDER_STATUSES = [
  '',
  'pending_payment',
  'processing',
  'paid',
  'fulfilling',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const BUILTIN_PRESETS = [
  {
    id: '_fulfill',
    name: 'Needs fulfillment today',
    value: { status: 'paid', placedFrom: startOfTodayISO(), placedTo: endOfTomorrowISO() },
  },
  { id: '_refunded', name: 'Refunded', value: { status: 'refunded' } },
  { id: '_balance', name: 'Has balance due (search)',
    value: { q: 'deposit' },
  },
];

function loadPresets() {
  try {
    const raw = localStorage.getItem(LS_PRESETS);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function savePresets(list) {
  localStorage.setItem(LS_PRESETS, JSON.stringify(list));
}

export default function OrdersList() {
  const { hasRole } = useRole();
  const canWrite = hasRole(ORDER_OPS_ROLES);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    q: '',
    placedFrom: '',
    placedTo: '',
    limit: 50,
    offset: 0,
  });
  const [selected, setSelected] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState('fulfilling');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [userPresets, setUserPresets] = useState(() => loadPresets());

  const query = useMemo(() => {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.q.trim()) q.q = filters.q.trim();
    if (filters.placedFrom) q.placedFrom = filters.placedFrom;
    if (filters.placedTo) q.placedTo = filters.placedTo;
    q.limit = String(filters.limit);
    q.offset = String(filters.offset);
    return q;
  }, [filters]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.orders(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount/query sync via async fetch */
  useEffect(() => {
    void fetchList();
  }, [fetchList]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleSel(id) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((x) => x.id)));
  }

  async function patchStatus(id, status) {
    await apiFetch(ADMIN.orderStatus(id), { method: 'PATCH', body: { status }, auth: true });
    await fetchList();
  }

  async function runBulk() {
    const ids = [...selected];
    const preview = { orderIds: ids, status: bulkStatus };
    await apiFetch(ADMIN.ordersBulkStatus(), { method: 'PATCH', body: preview, auth: true });
    setBulkOpen(false);
    setSelected(new Set());
    await fetchList();
  }

  function applyBuiltin(p) {
    setFilters((f) => ({
      ...f,
      status: p.value.status ?? '',
      q: p.value.q ?? '',
      placedFrom: p.value.placedFrom ?? '',
      placedTo: p.value.placedTo ?? '',
      offset: 0,
    }));
  }

  function saveCurrentPreset() {
    const name = presetName.trim();
    if (!name) return;
    const entry = {
      name,
      value: {
        status: filters.status,
        q: filters.q,
        placedFrom: filters.placedFrom,
        placedTo: filters.placedTo,
      },
    };
    const next = [...userPresets.filter((x) => x.name !== name), entry];
    setUserPresets(next);
    savePresets(next);
    setPresetName('');
  }

  function applyUserPreset(entry) {
    const v = entry.value;
    setFilters((f) => ({
      ...f,
      status: v.status ?? '',
      q: v.q ?? '',
      placedFrom: v.placedFrom ?? '',
      placedTo: v.placedTo ?? '',
      offset: 0,
    }));
  }

  const bulkPreviewText = JSON.stringify(
    { orderIds: [...selected], newStatus: bulkStatus },
    null,
    2,
  );

  return (
    <div>
      <h1 className="admin-page-title">Orders</h1>
      <p className="admin-page-sub">Filter, triage, and bulk-update fulfillment. Saved presets sync to this browser.</p>

      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div>
            <label className="field-label" htmlFor="o-status">Status</label>
            <select
              id="o-status"
              className="input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, offset: 0 }))}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s || 'any'} value={s}>
                  {s || 'Any'}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="o-q">Search</label>
            <input
              id="o-q"
              className="input"
              placeholder="Email or order code"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="o-from">Placed from</label>
            <input
              id="o-from"
              className="input"
              type="datetime-local"
              value={filters.placedFrom ? filters.placedFrom.slice(0, 16) : ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  placedFrom: e.target.value ? new Date(e.target.value).toISOString() : '',
                  offset: 0,
                }))
              }
            />
          </div>
          <div>
            <label className="field-label" htmlFor="o-to">Placed to</label>
            <input
              id="o-to"
              className="input"
              type="datetime-local"
              value={filters.placedTo ? filters.placedTo.slice(0, 16) : ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  placedTo: e.target.value ? new Date(e.target.value).toISOString() : '',
                  offset: 0,
                }))
              }
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn sm" onClick={() => fetchList()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="caps" style={{ marginRight: 12 }}>Quick filters</span>
        {BUILTIN_PRESETS.map((p) => (
          <button key={p.id} type="button" className="chip" style={{ marginRight: 8, marginBottom: 8 }} onClick={() => applyBuiltin(p)}>
            {p.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <input
          className="input"
          style={{ maxWidth: 200 }}
          placeholder="Preset name"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
        />
        <button type="button" className="btn ghost sm" onClick={saveCurrentPreset}>
          Save current as preset
        </button>
        {userPresets.map((p) => (
          <button key={p.name} type="button" className="chip active" onClick={() => applyUserPreset(p)}>
            {p.name}
          </button>
        ))}
      </div>

      {err ? <p className="admin-err">{err}</p> : null}

      {canWrite && selected.size > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <span style={{ marginRight: 12, fontSize: 13 }}>{selected.size} selected</span>
          <select
            className="input"
            style={{ display: 'inline-block', width: 200, marginRight: 8 }}
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            {ORDER_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="button" className="btn sm" onClick={() => setBulkOpen(true)}>
            Bulk change status…
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={bulkOpen}
        title="Bulk status change"
        confirmLabel="Apply"
        onCancel={() => setBulkOpen(false)}
        onConfirm={runBulk}
      >
        <p style={{ marginBottom: 8, fontSize: 14, color: 'var(--mute)' }}>Audit payload preview:</p>
        <pre>{bulkPreviewText}</pre>
      </ConfirmDialog>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {canWrite ? (
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll}
                  />
                </th>
              ) : null}
              <th>Code</th>
              <th>Email</th>
              <th>Placed</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canWrite ? 6 : 5}>Loading…</td>
              </tr>
            ) : null}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 6 : 5}>No orders match.</td>
              </tr>
            ) : null}
            {items.map((o) => (
              <tr key={o.id}>
                {canWrite ? (
                  <td>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSel(o.id)} />
                  </td>
                ) : null}
                <td>
                  <Link to={`/orders/${o.id}`} className="mono">{o.orderCode}</Link>
                </td>
                <td>{o.email}</td>
                <td className="mono">{o.placedAt ? new Date(o.placedAt).toLocaleString() : '—'}</td>
                <td>${Number(o.totalGrand).toFixed(2)}</td>
                <td>
                  {canWrite ? (
                    <select
                      className="input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={o.status}
                      onChange={(e) => {
                        const v = e.target.value;
                        patchStatus(o.id, v).catch((er) => setErr(er.message));
                      }}
                    >
                      {ORDER_STATUSES.filter(Boolean).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="chip">{o.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: 13, color: 'var(--mute)' }}>
        {total} total
        {filters.offset ? ` · offset ${filters.offset}` : ''}
      </p>
    </div>
  );
}
