import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ORDER_OPS_ROLES } from '../../auth/navConfig.js';

export default function OrderDetail() {
  const { id } = useParams();
  const { hasRole } = useRole();
  const canWrite = hasRole(ORDER_OPS_ROLES);

  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [carrier, setCarrier] = useState('DHL');
  const [tracking, setTracking] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr('');
    try {
      const json = await apiFetch(ADMIN.order(id), { auth: true });
      setData(json);
    } catch (e) {
      setErr(e.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount sync */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function fulfill() {
    await apiFetch(ADMIN.orderFulfill(id), {
      method: 'POST',
      body: { carrier, tracking },
      auth: true,
    });
    await load();
  }

  async function refund() {
    const body = refundAmount.trim() ? { amount: Number(refundAmount) } : {};
    await apiFetch(ADMIN.orderRefund(id), { method: 'POST', body, auth: true });
    await load();
  }

  async function cancel() {
    await apiFetch(ADMIN.orderCancel(id), {
      method: 'POST',
      body: { reason: cancelReason || undefined },
      auth: true,
    });
    await load();
  }

  if (!id) {
    return <p className="admin-err">Missing order id</p>;
  }

  const order = data?.order;

  return (
    <div>
      <p style={{ marginBottom: 12 }}>
        <Link to="/orders">← Orders</Link>
      </p>
      <h1 className="admin-page-title">{order ? order.orderCode : 'Order'}</h1>
      {loading ? <p>Loading…</p> : null}
      {err ? <p className="admin-err">{err}</p> : null}
      {!loading && order ? (
        <>
          <p className="admin-page-sub">
            {order.email} · {order.status}
            {order.shipCarrier ? ` · ${order.shipCarrier} ${order.shipTracking || ''}` : ''}
          </p>
          <div style={{ display: 'grid', gap: 8, marginBottom: 24, fontSize: 14 }}>
            <div>
              Totals: ${Number(order.subtotal).toFixed(2)} sub · ${Number(order.totalGrand).toFixed(2)} grand
            </div>
            <div className="mono" style={{ fontSize: 12 }}>
              {order.shipping?.line1}, {order.shipping?.city} {order.shipping?.zip}
            </div>
          </div>

          <h2 className="caps" style={{ marginBottom: 8 }}>Line items</h2>
          <div className="admin-table-wrap" style={{ marginBottom: 28 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Preorder</th>
                  <th>Line</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).map((li) => (
                  <tr key={li.id}>
                    <td>{li.name}{li.brand ? ` · ${li.brand}` : ''}</td>
                    <td>{li.qty}</td>
                    <td>{li.isPreorder ? 'Yes' : '—'}</td>
                    <td>${Number(li.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canWrite ? (
            <div style={{ display: 'grid', gap: 20, maxWidth: 420 }}>
              <section>
                <h3 className="caps" style={{ marginBottom: 8 }}>Fulfill (ship)</h3>
                <label className="field-label" htmlFor="car">Carrier</label>
                <input id="car" className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                <label className="field-label" htmlFor="tr" style={{ marginTop: 8 }}>Tracking</label>
                <input id="tr" className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => fulfill().catch((e) => setErr(e.message))}>
                  Mark shipped
                </button>
              </section>
              <section>
                <h3 className="caps" style={{ marginBottom: 8 }}>Refund (mock)</h3>
                <label className="field-label" htmlFor="ref">Amount (optional)</label>
                <input id="ref" className="input" type="number" min="0" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                <button type="button" className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => refund().catch((e) => setErr(e.message))}>
                  Refund
                </button>
              </section>
              <section>
                <h3 className="caps" style={{ marginBottom: 8 }}>Cancel</h3>
                <label className="field-label" htmlFor="why">Reason</label>
                <input id="why" className="input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                <button type="button" className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => cancel().catch((e) => setErr(e.message))}>
                  Cancel order
                </button>
              </section>
            </div>
          ) : (
            <p className="admin-page-sub">Read-only (insufficient role for writes).</p>
          )}

          <h2 className="caps" style={{ margin: '28px 0 8px' }}>Status history</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Change</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {(data.statusHistory ?? []).map((h) => (
                  <tr key={h.id}>
                    <td className="mono">{h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</td>
                    <td>{h.from_status ?? '∅'} → {h.to_status}</td>
                    <td>{h.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
