import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ORDER_OPS_ROLES } from '../../auth/navConfig.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { PaginationControls, SortButton, TableActions, TableCount } from '../../components/TableTools.jsx';
import { sortRows } from '../../components/tableUtils.js';
import { TableSkeleton } from '../../components/TableSkeleton.jsx';
import { CopyButton } from '../../components/CopyButton.jsx';
import { downloadCsv } from '../../lib/csv.js';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav.js';
import { ColumnControls, useColumnPrefs } from '../../components/ColumnControls.jsx';

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
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    q: '',
    placedFrom: '',
    placedTo: '',
    payMethod: '',
    source: '',
    limit: 50,
    offset: 0,
  });
  const [selected, setSelected] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState('fulfilling');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [editingPresetName, setEditingPresetName] = useState('');
  const [userPresets, setUserPresets] = useState(() => loadPresets());
  const [sort, setSort] = useState({ key: 'placedAt', dir: 'desc' });
  const [colsOpen, setColsOpen] = useState(false);

  const query = useMemo(() => {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.q.trim()) q.q = filters.q.trim();
    if (filters.placedFrom) q.placedFrom = filters.placedFrom;
    if (filters.placedTo) q.placedTo = filters.placedTo;
    if (filters.payMethod) q.payMethod = filters.payMethod;
    if (filters.source) q.source = filters.source;
    q.limit = String(filters.limit);
    q.offset = String(filters.offset);
    return q;
  }, [filters]);

  const hasActiveFilters = Boolean(
    filters.status ||
      filters.q.trim() ||
      filters.placedFrom ||
      filters.placedTo ||
      filters.payMethod ||
      filters.source,
  );

  function samePresetValue(value) {
    return (
      (value.status ?? '') === filters.status &&
      (value.q ?? '') === filters.q &&
      (value.placedFrom ?? '') === filters.placedFrom &&
      (value.placedTo ?? '') === filters.placedTo
    );
  }

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

  function clearFilters() {
    setSelected(new Set());
    setFilters((f) => ({
      ...f,
      status: '',
      q: '',
      placedFrom: '',
      placedTo: '',
      payMethod: '',
      source: '',
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
    const next = [...userPresets.filter((x) => x.name !== name && x.name !== editingPresetName), entry];
    setUserPresets(next);
    savePresets(next);
    setPresetName('');
    setEditingPresetName('');
  }

  function editUserPreset(entry) {
    setPresetName(entry.name);
    setEditingPresetName(entry.name);
    applyUserPreset(entry);
  }

  function deleteUserPreset(name) {
    const next = userPresets.filter((x) => x.name !== name);
    setUserPresets(next);
    savePresets(next);
    if (editingPresetName === name) {
      setEditingPresetName('');
      setPresetName('');
    }
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
  const visibleItems = useMemo(() => sortRows(items, sort), [items, sort]);
  const csvColumns = useMemo(
    () => [
      { key: 'orderCode', label: 'Order Code' },
      { key: 'email', label: 'Email' },
      { key: 'placedAt', label: 'Placed At', value: (o) => (o.placedAt ? new Date(o.placedAt).toISOString() : '') },
      { key: 'totalGrand', label: 'Total', value: (o) => Number(o.totalGrand ?? 0).toFixed(2) },
      { key: 'payMethod', label: 'Payment' },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
      { key: 'id', label: 'Order ID' },
    ],
    [],
  );

  const tableColumns = useMemo(() => {
    const cols = [
      canWrite
        ? { key: '_sel', label: 'Select' }
        : null,
      { key: 'orderCode', label: 'Code' },
      { key: 'email', label: 'Email' },
      { key: 'placedAt', label: 'Placed' },
      { key: 'totalGrand', label: 'Total' },
      { key: 'payMethod', label: 'Payment' },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
    ].filter(Boolean);
    return cols;
  }, [canWrite]);

  const colPrefs = useColumnPrefs({
    storageKey: 'linea-admin:orders:columns:v1',
    columns: tableColumns,
  });

  const { activeId } = useTableKeyboardNav({
    enabled: true,
    rows: visibleItems,
    getRowId: (o) => o.id,
    onOpenRow: (id) => navigate(`/orders/${id}`),
    onToggleRow: canWrite ? (id) => toggleSel(id) : null,
    captureWhen: (e) => {
      const t = e.target;
      const tag = (t?.tagName || '').toLowerCase();
      return tag !== 'input' && tag !== 'textarea' && tag !== 'select' && !t?.isContentEditable;
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="admin-page-title">Orders</h1>
          <p className="admin-page-sub">Filter, triage, and bulk-update fulfillment. Saved presets sync to this browser.</p>
        </div>
        {canWrite && (
          <Link to="/orders/new" className="btn">
            + New order
          </Link>
        )}
      </div>

      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div>
            <label className="field-label" htmlFor="o-status">Status</label>
            <select
              id="o-status"
              className={`input ${filters.status ? 'filter-active' : ''}`}
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
          <div>
            <label className="field-label" htmlFor="o-pay">Payment</label>
            <select
              id="o-pay"
              className={`input ${filters.payMethod ? 'filter-active' : ''}`}
              value={filters.payMethod}
              onChange={(e) => setFilters((f) => ({ ...f, payMethod: e.target.value, offset: 0 }))}
            >
              {['', 'cod', 'card', 'apple_pay', 'paypal', 'klarna'].map((m) => (
                <option key={m || 'any'} value={m}>
                  {m ? m.toUpperCase() : 'Any'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="o-source">Source</label>
            <select
              id="o-source"
              className={`input ${filters.source ? 'filter-active' : ''}`}
              value={filters.source}
              onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value, offset: 0 }))}
            >
              {['', 'web', 'manual', 'bot'].map((s) => (
                <option key={s || 'any'} value={s}>
                  {s ? s.toUpperCase() : 'Any'}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="o-q">Search</label>
            <input
              id="o-q"
              className={`input ${filters.q.trim() ? 'filter-active' : ''}`}
              placeholder="Email or order code"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="o-from">Placed from</label>
            <input
              id="o-from"
              className={`input ${filters.placedFrom ? 'filter-active' : ''}`}
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
              className={`input ${filters.placedTo ? 'filter-active' : ''}`}
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
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className={`btn ${hasActiveFilters ? '' : 'ghost'} sm`} disabled={!hasActiveFilters} onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="caps" style={{ marginRight: 12 }}>Quick filters</span>
        {BUILTIN_PRESETS.map((p) => (
          <button key={p.id} type="button" className={`chip ${samePresetValue(p.value) ? 'active' : ''}`} style={{ marginRight: 8, marginBottom: 8 }} onClick={() => applyBuiltin(p)}>
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
          {editingPresetName || userPresets.some((p) => p.name === presetName.trim()) ? 'Update preset' : 'Save current as preset'}
        </button>
        {editingPresetName ? (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              setEditingPresetName('');
              setPresetName('');
            }}
          >
            Cancel edit
          </button>
        ) : null}
        {userPresets.map((p) => (
          <span key={p.name} className={`admin-preset-chip ${samePresetValue(p.value) ? 'selected' : ''} ${editingPresetName === p.name ? 'editing' : ''}`}>
            <button type="button" className="admin-preset-name" onClick={() => applyUserPreset(p)} title="Apply preset">
              {p.name}
            </button>
            <button type="button" className="admin-preset-action" aria-label={`Edit ${p.name}`} onClick={() => editUserPreset(p)}>
              Edit
            </button>
            <button type="button" className="admin-preset-delete" aria-label={`Delete ${p.name}`} onClick={() => deleteUserPreset(p.name)}>
              x
            </button>
          </span>
        ))}
      </div>

      {err ? <p className="admin-err">{err}</p> : null}

      <TableActions>
        <button
          type="button"
          className="btn ghost sm"
          disabled={loading || visibleItems.length === 0}
          onClick={() =>
            downloadCsv({
              filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
              columns: csvColumns,
              rows: visibleItems,
            })
          }
        >
          Export CSV
        </button>
        <button type="button" className="btn ghost sm" onClick={() => setColsOpen(true)}>
          Columns
        </button>
      </TableActions>

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
              {colPrefs.visibleColumns.map((c) => {
                if (c.key === '_sel') {
                  return (
                    <th key={c.key} style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={items.length > 0 && selected.size === items.length}
                        onChange={toggleAll}
                      />
                    </th>
                  );
                }
                if (c.key === 'orderCode') return <th key={c.key}><SortButton label="Code" column="orderCode" sort={sort} onSort={setSort} /></th>;
                if (c.key === 'email') return <th key={c.key}><SortButton label="Email" column="email" sort={sort} onSort={setSort} /></th>;
                if (c.key === 'placedAt') return <th key={c.key}><SortButton label="Placed" column="placedAt" sort={sort} onSort={setSort} /></th>;
                if (c.key === 'totalGrand') return <th key={c.key}><SortButton label="Total" column="totalGrand" sort={sort} onSort={setSort} /></th>;
                if (c.key === 'status') return <th key={c.key}><SortButton label="Status" column="status" sort={sort} onSort={setSort} /></th>;
                return <th key={c.key}>{c.label}</th>;
              })}
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton rows={Math.max(6, Math.min(10, filters.limit))} cols={colPrefs.visibleColumns.length} />
          ) : (
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={colPrefs.visibleColumns.length}>No orders match.</td>
                </tr>
              ) : null}
              {visibleItems.map((o) => (
                <tr
                  key={o.id}
                  className={[
                    selected.has(o.id) ? 'admin-row-selected' : '',
                    o.id === activeId ? 'admin-row-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {colPrefs.visibleColumns.map((c) => {
                    if (c.key === '_sel') {
                      return (
                        <td key={c.key}>
                          <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSel(o.id)} />
                        </td>
                      );
                    }
                    if (c.key === 'orderCode') {
                      return (
                        <td key={c.key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Link to={`/orders/${o.id}`} className="mono">{o.orderCode}</Link>
                      <CopyButton value={o.orderCode} label="Copy order code" copiedLabel="Copied order code" />
                          </div>
                        </td>
                      );
                    }
                    if (c.key === 'email') {
                      return (
                        <td key={c.key}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>{o.email}</span>
                            <CopyButton value={o.email} label="Copy email" copiedLabel="Copied email" />
                          </div>
                        </td>
                      );
                    }
                    if (c.key === 'placedAt') return <td key={c.key} className="mono">{o.placedAt ? new Date(o.placedAt).toLocaleString() : '—'}</td>;
                    if (c.key === 'totalGrand') return <td key={c.key}>${Number(o.totalGrand).toFixed(2)}</td>;
                    if (c.key === 'payMethod')
                      return (
                        <td key={c.key} className="mono" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                          {o.payMethod || '—'}
                        </td>
                      );
                    if (c.key === 'source')
                      return (
                        <td key={c.key} className="mono" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                          {o.source || '—'}
                        </td>
                      );
                    if (c.key === 'status') {
                      return (
                        <td key={c.key}>
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
                      );
                    }
                    return <td key={c.key}>{o?.[c.key] ?? '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      <ColumnControls
        open={colsOpen}
        onClose={() => setColsOpen(false)}
        columns={colPrefs.orderedColumns}
        columnState={colPrefs.columnState}
        onToggle={colPrefs.toggle}
        onMove={colPrefs.move}
        onReset={colPrefs.reset}
      />

      <TableCount shown={visibleItems.length} total={total} offset={filters.offset} label="orders" />
      <PaginationControls
        limit={filters.limit}
        offset={filters.offset}
        total={total}
        onPage={(offset) => {
          setSelected(new Set());
          setFilters((f) => ({ ...f, offset }));
        }}
        onLimit={(limit) => {
          setSelected(new Set());
          setFilters((f) => ({ ...f, limit, offset: 0 }));
        }}
      />
    </div>
  );
}
