import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ORDER_OPS_ROLES } from '../../auth/navConfig.js';

const EDITABLE_STATUSES = ['pending_payment', 'processing'];

function fulfillmentLabel(shipMethod) {
  if (shipMethod === 'pickup') return 'Store pickup';
  if (shipMethod === 'express') return 'Express ship';
  if (shipMethod === 'standard') return 'Standard ship';
  return shipMethod || '—';
}

let draftSeq = 0;

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

  // Item editing
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]); // { key, id?, name, unit, qty, _new?, productId?, size?, color? }
  const [editNote, setEditNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [products, setProducts] = useState([]);
  const [add, setAdd] = useState({ productId: '', variants: [], size: '', color: '', qty: 1, loading: false });

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

  function startEdit() {
    setEditNote('');
    setAdd({ productId: '', variants: [], size: '', color: '', qty: 1, loading: false });
    setDraft(
      (data.items ?? []).map((li) => ({
        key: li.id,
        id: li.id,
        name: li.name,
        brand: li.brand,
        unit: li.qty ? Number(li.lineTotal) / li.qty : Number(li.unitPrice ?? 0),
        qty: li.qty,
        _new: false,
      })),
    );
    setEditing(true);
    if (!products.length) {
      apiFetch(ADMIN.products({ limit: '100' }), { auth: true })
        .then((d) => setProducts(d.items ?? []))
        .catch(() => {});
    }
  }

  async function onAddProduct(productId) {
    setAdd((a) => ({ ...a, productId, variants: [], size: '', color: '', loading: Boolean(productId) }));
    if (!productId) return;
    try {
      const detail = await apiFetch(ADMIN.product(productId), { auth: true });
      setAdd((a) => ({ ...a, variants: detail.variants ?? [], basePrice: Number(detail.basePrice ?? 0), loading: false }));
    } catch {
      setAdd((a) => ({ ...a, loading: false }));
    }
  }

  function addDraftItem() {
    const v = add.variants.find((x) => (x.size ?? '') === (add.size ?? '') && x.colorName === add.color);
    if (!v) return;
    const product = products.find((p) => p.id === add.productId);
    draftSeq += 1;
    setDraft((d) => [
      ...d,
      {
        key: `new-${draftSeq}`,
        _new: true,
        productId: add.productId,
        size: v.size ?? undefined,
        color: v.colorName,
        name: product?.name ?? 'Item',
        unit: (add.basePrice ?? 0) + Number(v.priceDelta ?? 0),
        qty: Number(add.qty) || 1,
      },
    ]);
    setAdd({ productId: '', variants: [], size: '', color: '', qty: 1, loading: false });
  }

  async function saveEdit() {
    setErr('');
    if (!draft.length) {
      setErr('An order must keep at least one item');
      return;
    }
    setSavingEdit(true);
    try {
      const items = draft.map((d) =>
        d._new ? { productId: d.productId, size: d.size || undefined, color: d.color, qty: Number(d.qty) } : { id: d.id, qty: Number(d.qty) },
      );
      await apiFetch(ADMIN.orderItems(id), { method: 'PATCH', body: { items, note: editNote.trim() || undefined }, auth: true });
      setEditing(false);
      await load();
    } catch (e) {
      setErr(e.message || 'Could not save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  const draftSubtotal = draft.reduce((s, d) => s + d.unit * (Number(d.qty) || 0), 0);

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

  async function markPickedUp() {
    await apiFetch(ADMIN.orderStatus(id), { method: 'PATCH', body: { status: 'delivered' }, auth: true });
    await load();
  }

  if (!id) {
    return <p className="admin-err">Missing order id</p>;
  }

  const order = data?.order;
  const isPickup = order?.shipMethod === 'pickup';

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
            {order.shipMethod ? (
              <> · <span className={`badge ${isPickup ? 'ok' : 'muted'}`}>{fulfillmentLabel(order.shipMethod)}</span></>
            ) : null}
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 className="caps" style={{ margin: 0 }}>Line items</h2>
            {canWrite && !editing && EDITABLE_STATUSES.includes(order.status) && (
              <button type="button" className="btn ghost sm" onClick={startEdit}>
                Edit items
              </button>
            )}
            {canWrite && !editing && !EDITABLE_STATUSES.includes(order.status) && (
              <span style={{ fontSize: 11, color: 'var(--mute)' }}>Items locked once {order.status}</span>
            )}
          </div>

          {!editing ? (
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
          ) : (
            <div className="admin-toolbar" style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Unit</th>
                      <th style={{ width: 90 }}>Qty</th>
                      <th>Line</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map((d) => (
                      <tr key={d.key}>
                        <td>{d.name}{d.brand ? ` · ${d.brand}` : ''}{d._new ? <em style={{ color: 'var(--mute)' }}> (new)</em> : ''}</td>
                        <td>${d.unit.toFixed(2)}</td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            max="99"
                            value={d.qty}
                            style={{ width: 70, padding: '4px 6px' }}
                            onChange={(e) => setDraft((ls) => ls.map((x) => (x.key === d.key ? { ...x, qty: e.target.value } : x)))}
                          />
                        </td>
                        <td>${(d.unit * (Number(d.qty) || 0)).toFixed(2)}</td>
                        <td>
                          <button type="button" className="btn ghost sm" title="Remove" onClick={() => setDraft((ls) => ls.filter((x) => x.key !== d.key))}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!draft.length && (
                      <tr>
                        <td colSpan={5} style={{ color: 'var(--rust, #b4542e)' }}>No items — add at least one before saving.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add item */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.4fr 70px auto', gap: 8, alignItems: 'end' }}>
                <div>
                  <label className="field-label">Add product</label>
                  <select className="input" value={add.productId} onChange={(e) => onAddProduct(e.target.value)}>
                    <option value="">Select…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.brandName ? ` — ${p.brandName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Size</label>
                  <select
                    className="input"
                    value={add.size}
                    disabled={!add.productId || add.loading}
                    onChange={(e) => setAdd((a) => ({ ...a, size: e.target.value, color: '' }))}
                  >
                    <option value="">—</option>
                    {[...new Set(add.variants.map((v) => v.size ?? ''))].filter((s) => s !== '').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Colour</label>
                  <select
                    className="input"
                    value={add.color}
                    disabled={!add.productId || add.loading}
                    onChange={(e) => setAdd((a) => ({ ...a, color: e.target.value }))}
                  >
                    <option value="">Colour…</option>
                    {add.variants
                      .filter((v) => (v.size ?? '') === (add.size ?? ''))
                      .map((v) => (
                        <option key={v.colorName} value={v.colorName} disabled={v.stock < 1}>
                          {v.colorName} ({v.stock})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Qty</label>
                  <input className="input" type="number" min="1" max="99" value={add.qty} onChange={(e) => setAdd((a) => ({ ...a, qty: e.target.value }))} />
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={!add.variants.find((x) => (x.size ?? '') === (add.size ?? '') && x.colorName === add.color)}
                  onClick={addDraftItem}
                >
                  + Add
                </button>
              </div>

              <div>
                <label className="field-label">Reason / note (optional)</label>
                <input className="input" value={editNote} placeholder="e.g. customer dropped last item" onChange={(e) => setEditNote(e.target.value)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--mute)' }}>
                  Items subtotal ${draftSubtotal.toFixed(2)} · final total (tax/shipping) recomputed on save
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn ghost sm" disabled={savingEdit} onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn sm" disabled={savingEdit || !draft.length} onClick={saveEdit}>
                    {savingEdit ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {canWrite ? (
            <div style={{ display: 'grid', gap: 20, maxWidth: 420 }}>
              {isPickup ? (
                <section>
                  <h3 className="caps" style={{ marginBottom: 8 }}>Store pickup</h3>
                  <p className="admin-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                    Customer collects in store. Use the POS register <strong>Pickups</strong> tab to hand off, or mark delivered here when they&apos;ve collected.
                  </p>
                  {['paid', 'processing', 'fulfilling'].includes(order.status) ? (
                    <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => markPickedUp().catch((e) => setErr(e.message))}>
                      Mark picked up
                    </button>
                  ) : null}
                </section>
              ) : (
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
              )}
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
