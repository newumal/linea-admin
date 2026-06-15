import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ORDER_OPS_ROLES } from '../../auth/navConfig.js';
import { uiEmit } from '../../lib/uiBus.js';

const PAY_METHODS = ['cod', 'card', 'apple_pay', 'paypal', 'klarna'];
const SHIP_METHODS = ['standard', 'express', 'pickup'];

let lineSeq = 0;
function emptyLine() {
  lineSeq += 1;
  return { key: `l${lineSeq}`, productId: '', basePrice: 0, variantId: '', size: '', color: '', qty: 1, variants: [], loading: false };
}

export default function OrderCreate() {
  const { hasRole } = useRole();
  const canWrite = hasRole(ORDER_OPS_ROLES);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState(() => [emptyLine()]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [shipping, setShipping] = useState({ line1: '', line2: '', city: '', state: '', zip: '', country: '' });
  const [payMethod, setPayMethod] = useState('cod');
  const [shipMethod, setShipMethod] = useState('standard');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiFetch(ADMIN.products({ limit: '200' }), { auth: true })
      .then((d) => {
        if (!cancelled) setProducts(d.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setErr('Could not load products');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patchLine(key, patch) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function onProductChange(key, productId) {
    patchLine(key, { productId, variantId: '', size: '', color: '', basePrice: 0, variants: [], loading: Boolean(productId) });
    if (!productId) return;
    try {
      const detail = await apiFetch(ADMIN.product(productId), { auth: true });
      patchLine(key, { variants: detail.variants ?? [], basePrice: Number(detail.basePrice ?? 0), loading: false });
    } catch {
      patchLine(key, { loading: false });
      uiEmit({ type: 'toast', tone: 'error', message: 'Could not load variants' });
    }
  }

  function onVariantChange(key, variantId) {
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const v = l.variants.find((x) => x.id === variantId);
        return { ...l, variantId, size: v?.size ?? '', color: v?.colorName ?? '' };
      }),
    );
  }

  const estTotal = useMemo(() => {
    let t = 0;
    for (const l of lines) {
      const v = l.variants.find((x) => x.id === l.variantId);
      if (v) t += (l.basePrice + Number(v.priceDelta ?? 0)) * (Number(l.qty) || 0);
    }
    return t;
  }, [lines]);

  function validate() {
    if (!customer.name.trim()) return 'Customer name is required';
    if (!customer.email.trim()) return 'Customer email is required';
    if (!shipping.line1.trim()) return 'Delivery address (line 1) is required';
    if (!lines.length) return 'Add at least one item';
    for (const l of lines) {
      if (!l.productId) return 'Pick a product for every line';
      if (!l.variantId) return 'Pick a size/colour for every line';
      if (!Number(l.qty) || Number(l.qty) < 1) return 'Quantity must be at least 1';
    }
    return '';
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setSubmitting(true);
    try {
      const trimmed = (s) => (s.trim() ? s.trim() : undefined);
      const payload = {
        items: lines.map((l) => ({
          productId: l.productId,
          size: l.size || undefined,
          color: l.color,
          qty: Number(l.qty),
        })),
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: trimmed(customer.phone),
        },
        shipping: {
          line1: shipping.line1.trim(),
          line2: trimmed(shipping.line2),
          city: trimmed(shipping.city),
          state: trimmed(shipping.state),
          zip: trimmed(shipping.zip),
          country: trimmed(shipping.country),
        },
        payMethod,
        shipMethod,
        note: trimmed(note),
      };
      const res = await apiFetch(ADMIN.orders(), { method: 'POST', body: payload, auth: true });
      uiEmit({ type: 'toast', tone: 'success', message: `Order ${res.order.orderCode} created` });
      navigate(`/orders/${res.order.id}`);
    } catch (e2) {
      setErr(e2.message || 'Could not create order');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canWrite) {
    return (
      <div>
        <h1 className="admin-page-title">New order</h1>
        <p className="admin-page-sub">You don’t have permission to create orders.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-page-title">New order</h1>
      <p className="admin-page-sub">
        Manually record an order placed by phone, in person, or off-platform. It is tagged{' '}
        <strong>manual</strong> in the orders list.
      </p>

      <form onSubmit={submit} style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Items */}
        <section className="admin-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700 }}>Items</div>
          {lines.map((l) => {
            const variant = l.variants.find((x) => x.id === l.variantId);
            return (
              <div key={l.key} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 90px 32px', gap: 10, alignItems: 'end' }}>
                <div>
                  <label className="field-label">Product</label>
                  <select className="input" value={l.productId} onChange={(e) => onProductChange(l.key, e.target.value)}>
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.brandName ? ` — ${p.brandName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Size · Colour</label>
                  <select
                    className="input"
                    value={l.variantId}
                    disabled={!l.productId || l.loading}
                    onChange={(e) => onVariantChange(l.key, e.target.value)}
                  >
                    <option value="">{l.loading ? 'Loading…' : 'Select…'}</option>
                    {l.variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.stock < 1}>
                        {[v.size, v.colorName].filter(Boolean).join(' · ')} ({v.stock} in stock)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Qty</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="99"
                    value={l.qty}
                    onChange={(e) => patchLine(l.key, { qty: e.target.value })}
                  />
                </div>
                <div style={{ fontSize: 13, paddingBottom: 8, textAlign: 'right' }}>
                  {variant ? `$${((l.basePrice + Number(variant.priceDelta ?? 0)) * (Number(l.qty) || 0)).toFixed(2)}` : '—'}
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  title="Remove item"
                  disabled={lines.length === 1}
                  onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                >
                  ✕
                </button>
              </div>
            );
          })}
          <div>
            <button type="button" className="btn ghost sm" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
              + Add item
            </button>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 700 }}>
            Estimated total: ${estTotal.toFixed(2)}
            <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--mute)' }}>Final total is computed server-side on save.</div>
          </div>
        </section>

        {/* Customer */}
        <section className="admin-toolbar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1', fontWeight: 700 }}>Customer</div>
          <div>
            <label className="field-label">Name *</label>
            <input className="input" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Email *</label>
            <input className="input" type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Phone</label>
            <input className="input" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} />
          </div>
        </section>

        {/* Shipping */}
        <section className="admin-toolbar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1', fontWeight: 700 }}>Delivery</div>
          <div style={{ gridColumn: '1 / 3' }}>
            <label className="field-label">Address line 1 *</label>
            <input className="input" value={shipping.line1} onChange={(e) => setShipping((s) => ({ ...s, line1: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Line 2</label>
            <input className="input" value={shipping.line2} onChange={(e) => setShipping((s) => ({ ...s, line2: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">City</label>
            <input className="input" value={shipping.city} onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">State</label>
            <input className="input" value={shipping.state} onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">ZIP</label>
            <input className="input" value={shipping.zip} onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Country</label>
            <input className="input" value={shipping.country} onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))} />
          </div>
        </section>

        {/* Payment + note */}
        <section className="admin-toolbar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
          <div>
            <label className="field-label">Payment</label>
            <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {PAY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Shipping</label>
            <select className="input" value={shipMethod} onChange={(e) => setShipMethod(e.target.value)}>
              {SHIP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Note</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. phoned in by customer" />
          </div>
        </section>

        {err && <p style={{ color: 'var(--rust, #b4542e)', fontSize: 13 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create order'}
          </button>
          <Link to="/orders" className="btn ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
