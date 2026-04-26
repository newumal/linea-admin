import { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ORDER_OPS_ROLES } from '../../auth/navConfig.js';
import { PaginationControls, SortButton, TableCount } from '../../components/TableTools.jsx';
import { sortRows } from '../../components/tableUtils.js';

const STATUSES = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

function monthKey(item) {
  if (!item.shipMonth) return 'TBD';
  const s = String(item.shipMonth);
  return s.length >= 7 ? s.slice(0, 7) : s;
}

export default function PreordersKanban() {
  const { hasRole } = useRole();
  const canWrite = hasRole(ORDER_OPS_ROLES);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [sort, setSort] = useState({ key: 'shipMonth', dir: 'asc' });
  const [filters, setFilters] = useState({
    status: '',
    q: '',
    shipMonth: '',
    balance: '',
    limit: 100,
    offset: 0,
  });

  const query = useMemo(() => {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.q.trim()) q.q = filters.q.trim();
    if (filters.shipMonth) q.shipMonth = filters.shipMonth;
    if (filters.balance) q.balance = filters.balance;
    q.limit = String(filters.limit);
    q.offset = String(filters.offset);
    return q;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.preorders(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load pre-orders');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount sync */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const byStatus = useMemo(() => {
    /** @type {Record<string, typeof items>} */
    const m = {};
    for (const s of STATUSES) m[s] = [];
    for (const it of items) {
      if (m[it.status]) m[it.status].push(it);
      else m.PENDING.push(it);
    }
    for (const s of STATUSES) {
      m[s].sort((a, b) => String(a.shipMonth).localeCompare(String(b.shipMonth)) || a.orderCode.localeCompare(b.orderCode));
    }
    return m;
  }, [items]);
  const tableItems = useMemo(() => sortRows(items, sort), [items, sort]);

  async function patchStatus(id, status) {
    await apiFetch(ADMIN.preorderStatus(id), { method: 'PATCH', body: { status }, auth: true });
    await load();
  }

  const onDragEnd = async (result) => {
    if (!canWrite) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const nextStatus = destination.droppableId;
    if (nextStatus === source.droppableId) return;
    try {
      await patchStatus(draggableId, nextStatus);
      if (nextStatus === 'SHIPPED') {
        const go = window.confirm('Capture remaining balance now? (mock payment)');
        if (go) {
          await apiFetch(ADMIN.preorderCapture(draggableId), { method: 'POST', auth: true });
          await load();
        }
      }
    } catch (e) {
      setErr(e.message || 'Update failed');
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Pre-orders</h1>
      <p className="admin-page-sub">
        Kanban is for daily ops. Use table view, filters, and pagination when volume grows.
        {!canWrite ? ' Read-only for your role.' : ''}
      </p>
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="caps">Loaded</span>
          <strong>{items.length}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="caps">Matching</span>
          <strong>{total}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="caps">Balance due</span>
          <strong>{items.filter((x) => Number(x.balanceAmount ?? 0) > 0 && !x.balanceCapturedAt).length}</strong>
        </div>
      </div>
      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div>
            <label className="field-label" htmlFor="po-status">Status</label>
            <select id="po-status" className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, offset: 0 }))}>
              <option value="">Any</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="po-q">Search</label>
            <input id="po-q" className="input" placeholder="Order, email, product" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, offset: 0 }))} />
          </div>
          <div>
            <label className="field-label" htmlFor="po-month">Ship month</label>
            <input id="po-month" className="input" type="month" value={filters.shipMonth} onChange={(e) => setFilters((f) => ({ ...f, shipMonth: e.target.value, offset: 0 }))} />
          </div>
          <div>
            <label className="field-label" htmlFor="po-balance">Balance</label>
            <select id="po-balance" className="input" value={filters.balance} onChange={(e) => setFilters((f) => ({ ...f, balance: e.target.value, offset: 0 }))}>
              <option value="">Any</option>
              <option value="due">Due</option>
              <option value="captured">Captured</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn sm" onClick={() => void load()}>
              Refresh
            </button>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn ghost sm" onClick={() => setFilters((f) => ({ ...f, status: '', q: '', shipMonth: '', balance: '', offset: 0 }))}>
              Clear
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" className={`chip ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Kanban</button>
        <button type="button" className={`chip ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
      </div>
      {err ? <p className="admin-err">{err}</p> : null}
      {loading ? <p>Loading…</p> : null}

      {!loading && view === 'kanban' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="admin-kanban">
            {STATUSES.map((status) => {
              const col = byStatus[status] ?? [];
              return (
                <Droppable key={status} droppableId={status} isDropDisabled={!canWrite}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.droppableProps} className="admin-kanban-col" style={{ background: snap.isDraggingOver ? 'var(--surface)' : undefined }}>
                      <h3>{status.replace(/_/g, ' ')}</h3>
                      {col.map((it, index) => {
                        const showLane =
                          index === 0 || monthKey(it) !== monthKey(col[index - 1]);
                        return (
                          <Draggable key={it.id} draggableId={it.id} index={index} isDragDisabled={!canWrite}>
                            {(dp, ds) => (
                              <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}>
                                {showLane ? (
                                  <div className="admin-kanban-lane">{monthKey(it)}</div>
                                ) : null}
                                <div
                                  className="admin-kanban-card"
                                  style={{
                                    boxShadow: ds.isDragging ? 'var(--shadow-md)' : undefined,
                                  }}
                                >
                                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{it.productName}</div>
                                  <div className="mono" style={{ fontSize: 11, marginTop: 4 }}>{it.orderCode}</div>
                                  <div className="meta">
                                    {it.lineName} ×{it.qty} · bal ${Number(it.balanceAmount ?? 0).toFixed(2)}
                                    {it.balanceCapturedAt ? ' · balance captured' : ''}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      ) : null}
      {!loading && view === 'table' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><SortButton label="Order" column="orderCode" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Product" column="productName" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Ship month" column="shipMonth" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Balance" column="balanceAmount" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Status" column="status" sort={sort} onSort={setSort} /></th>
              </tr>
            </thead>
            <tbody>
              {tableItems.map((it) => (
                <tr key={it.id}>
                  <td className="mono">{it.orderCode}</td>
                  <td>{it.productName}<span className="admin-muted" style={{ marginLeft: 8 }}>{it.lineName} x{it.qty}</span></td>
                  <td className="mono">{monthKey(it)}</td>
                  <td>${Number(it.balanceAmount ?? 0).toFixed(2)}{it.balanceCapturedAt ? ' captured' : ''}</td>
                  <td>
                    {canWrite ? (
                      <select className="input" style={{ padding: '6px 8px', fontSize: 12 }} value={it.status} onChange={(e) => void patchStatus(it.id, e.target.value).catch((er) => setErr(er.message || 'Update failed'))}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="chip">{it.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableItems.length === 0 ? <p className="admin-muted" style={{ padding: 16 }}>No pre-orders match.</p> : null}
        </div>
      ) : null}
      {!loading ? (
        <>
          <TableCount shown={items.length} total={total} offset={filters.offset} label="pre-orders" />
          <PaginationControls
            limit={filters.limit}
            offset={filters.offset}
            total={total}
            onPage={(offset) => setFilters((f) => ({ ...f, offset }))}
            onLimit={(limit) => setFilters((f) => ({ ...f, limit, offset: 0 }))}
          />
        </>
      ) : null}
    </div>
  );
}
