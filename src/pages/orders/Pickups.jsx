import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ORDER_OPS_ROLES } from '../../auth/navConfig.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { CopyButton } from '../../components/CopyButton.jsx';

function formatWait(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  if (s < 60) return '<1m';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return h ? `${d}d ${h}h` : `${d}d`;
}

function formatPlacedAt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function PickupQueuePage() {
  const { hasRole } = useRole();
  const canWrite = hasRole(ORDER_OPS_ROLES);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const data = await apiFetch(ADMIN.orderPickupQueue(), { auth: true });
      setItems(data.items ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load pickup queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function markPickedUp(orderId) {
    setBusyId(orderId);
    setErr('');
    try {
      await apiFetch(ADMIN.orderStatus(orderId), { method: 'PATCH', body: { status: 'delivered' }, auth: true });
      await load();
    } catch (e) {
      setErr(e.message || 'Could not mark picked up');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    setErr('');
    try {
      await apiFetch(ADMIN.orderCancel(cancelTarget.id), {
        method: 'POST',
        body: { reason: cancelReason.trim() || undefined },
        auth: true,
      });
      setCancelTarget(null);
      setCancelReason('');
      await load();
    } catch (e) {
      setErr(e.message || 'Could not cancel order');
    } finally {
      setBusyId(null);
    }
  }

  const longestWait = items[0]?.waitingSeconds ?? 0;

  return (
    <div>
      <p style={{ marginBottom: 12 }}>
        <Link to="/orders">← All orders</Link>
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Pickup queue</h1>
          <p className="admin-page-sub">
            Store pickup orders waiting for handoff — sorted <strong>longest wait first</strong>. Call the customer if needed, then mark picked up or cancel.
          </p>
        </div>
        <button type="button" className="btn ghost sm" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {err ? <p className="admin-err">{err}</p> : null}

      <div className="admin-toolbar" style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>Waiting now</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{loading ? '…' : items.length}</div>
        </div>
        {items.length > 0 ? (
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>Longest wait</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatWait(longestWait)}</div>
          </div>
        ) : null}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Waiting</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Placed</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Source</th>
              {canWrite ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canWrite ? 9 : 8}>Loading…</td>
              </tr>
            ) : null}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 9 : 8}>No pickup orders waiting.</td>
              </tr>
            ) : null}
            {!loading
              ? items.map((o, idx) => (
                  <tr key={o.id} className={idx === 0 ? 'admin-row-active' : ''}>
                    <td>
                      <span className={`badge ${idx === 0 ? 'ok' : 'muted'}`} style={{ fontSize: 11 }}>
                        {formatWait(o.waitingSeconds)}
                        {idx === 0 ? ' · oldest' : ''}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Link to={`/orders/${o.id}`} className="mono">
                          {o.orderCode}
                        </Link>
                        <CopyButton value={o.orderCode} label="Copy order code" copiedLabel="Copied" />
                      </div>
                    </td>
                    <td>
                      <div>{o.customer.name || '—'}</div>
                      {o.customer.phone ? (
                        <div className="mono" style={{ fontSize: 12, color: 'var(--mute)' }}>
                          <a href={`tel:${o.customer.phone}`}>{o.customer.phone}</a>
                        </div>
                      ) : null}
                      <div className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>{o.email}</div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{formatPlacedAt(o.placedAt)}</td>
                    <td>{o.itemCount}</td>
                    <td>
                      {o.currency} {Number(o.totalGrand).toFixed(2)}
                    </td>
                    <td>
                      <span className="chip">{o.status}</span>
                    </td>
                    <td className="mono" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                      {o.source}
                    </td>
                    {canWrite ? (
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn sm"
                            disabled={busyId === o.id}
                            onClick={() => void markPickedUp(o.id)}
                          >
                            {busyId === o.id ? '…' : 'Picked up'}
                          </button>
                          <button
                            type="button"
                            className="btn sm ghost"
                            disabled={busyId === o.id}
                            onClick={() => {
                              setCancelTarget(o);
                              setCancelReason('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={cancelTarget ? `Cancel ${cancelTarget.orderCode}?` : ''}
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        onCancel={() => {
          setCancelTarget(null);
          setCancelReason('');
        }}
        onConfirm={() => void confirmCancel()}
      >
        <p className="admin-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Use after calling the customer or if they no longer want the order. Stock is restored automatically.
        </p>
        <label className="field-label" htmlFor="pickup-cancel-reason">
          Reason (optional)
        </label>
        <input
          id="pickup-cancel-reason"
          className="input"
          value={cancelReason}
          placeholder="e.g. Customer requested cancel by phone"
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}
