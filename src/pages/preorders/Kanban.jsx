import { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ORDER_OPS_ROLES } from '../../auth/navConfig.js';

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
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.preorders(), { auth: true });
      setItems(data.items ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load pre-orders');
    } finally {
      setLoading(false);
    }
  }, []);

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
        Columns = workflow status. Within each column, cards group by ship month. Drag a card to change status.
        {!canWrite ? ' Read-only for your role.' : ''}
      </p>
      {err ? <p className="admin-err">{err}</p> : null}
      {loading ? <p>Loading…</p> : null}

      {!loading ? (
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
    </div>
  );
}
