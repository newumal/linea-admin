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
  return { key: `l${lineSeq}`, productId: '', productName: '', basePrice: 0, variants: [], size: '', color: '', qty: 1, loading: false };
}

export default function OrderCreate() {
  const { hasRole } = useRole();
  const canWrite = hasRole(ORDER_OPS_ROLES);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  // Shared filters for the product pickers.
  const [pf, setPf] = useState({ q: '', brandId: '', categoryId: '' });

  const [lines, setLines] = useState(() => [emptyLine()]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [shipping, setShipping] = useState({ line1: '', line2: '', city: '', state: '', zip: '', country: '' });
  const [payMethod, setPayMethod] = useState('cod');
  const [shipMethod, setShipMethod] = useState('standard');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // Brands + categories for the filter dropdowns (once).
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch(ADMIN.brands({ limit: '100' }), { auth: true }).catch(() => ({ items: [] })),
      apiFetch(ADMIN.categories({ limit: '100' }), { auth: true }).catch(() => ({ items: [] })),
    ]).then(([b, c]) => {
      if (cancelled) return;
      setBrands(b.items ?? b ?? []);
      setCategories(c.items ?? c ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Product list, re-fetched whenever a filter changes (limit 100 = endpoint max).
  /* eslint-disable react-hooks/set-state-in-effect -- async product fetch driven by filter changes */
  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    const query = { limit: '100' };
    if (pf.q.trim()) query.q = pf.q.trim();
    if (pf.brandId) query.brandId = pf.brandId;
    if (pf.categoryId) query.categoryId = pf.categoryId;
    apiFetch(ADMIN.products(query), { auth: true })
      .then((d) => {
        if (!cancelled) setProducts(d.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setErr('Could not load products');
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pf]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function patchLine(key, patch) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function onProductChange(key, productId) {
    const picked = products.find((p) => p.id === productId);
    patchLine(key, {
      productId,
      productName: picked?.name ?? '',
      size: '',
      color: '',
      basePrice: 0,
      variants: [],
      loading: Boolean(productId),
    });
    if (!productId) return;
    try {
      const detail = await apiFetch(ADMIN.product(productId), { auth: true });
      patchLine(key, { variants: detail.variants ?? [], basePrice: Number(detail.basePrice ?? 0), loading: false });
    } catch {
      patchLine(key, { loading: false });
      uiEmit({ type: 'toast', tone: 'error', message: 'Could not load variants' });
    }
  }

  const estTotal = useMemo(() => {
    let t = 0;
    for (const l of lines) {
      const v = l.variants.find((x) => (x.size ?? '') === (l.size ?? '') && x.colorName === l.color);
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
      const v = l.variants.find((x) => (x.size ?? '') === (l.size ?? '') && x.colorName === l.color);
      if (!v) return 'Pick a valid size + colour for every line';
      if (v.stock < (Number(l.qty) || 0)) return `Only ${v.stock} in stock for ${l.productName}`;
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
        items: lines.map((l) => ({ productId: l.productId, size: l.size || undefined, color: l.color, qty: Number(l.qty) })),
        customer: { name: customer.name.trim(), email: customer.email.trim(), phone: trimmed(customer.phone) },
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

  // Product options always include each line's current selection, even if filtered out.
  const selectedIds = new Set(lines.map((l) => l.productId).filter(Boolean));
  const pickedById = new Map(lines.filter((l) => l.productId).map((l) => [l.productId, l.productName]));
  const productOptions = [
    ...products,
    ...[...selectedIds].filter((id) => !products.some((p) => p.id === id)).map((id) => ({ id, name: pickedById.get(id) || '(selected)' })),
  ];

  return (
    <div>
      <h1 className="admin-page-title">New order</h1>
      <p className="admin-page-sub">
        Manually record an order placed by phone, in person, or off-platform. It is tagged <strong>manual</strong> in the orders list.
      </p>

      <form onSubmit={submit} style={{ maxWidth: 980, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Items */}
        <section className="admin-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>Items</span>
            <span style={{ fontSize: 11, color: 'var(--mute)' }}>
              {productsLoading ? 'Loading products…' : `${products.length} products`}
            </span>
          </div>

          {/* Shared product filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <div>
              <label className="field-label">Search (name / slug / code)</label>
              <input
                className="input"
                value={pf.q}
                placeholder="Search products…"
                onChange={(e) => setPf((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Brand</label>
              <select className="input" value={pf.brandId} onChange={(e) => setPf((f) => ({ ...f, brandId: e.target.value }))}>
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="input" value={pf.categoryId} onChange={(e) => setPf((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {lines.map((l) => {
            const sizes = [...new Set(l.variants.map((v) => v.size ?? ''))];
            const hasSizes = sizes.some((s) => s !== '');
            const colorVariants = l.variants.filter((v) => (v.size ?? '') === (l.size ?? ''));
            const colorsSeen = new Set();
            const colorOptions = colorVariants.filter((v) => {
              if (colorsSeen.has(v.colorName)) return false;
              colorsSeen.add(v.colorName);
              return true;
            });
            const variant = l.variants.find((v) => (v.size ?? '') === (l.size ?? '') && v.colorName === l.color);
            return (
              <div
                key={l.key}
                style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1.4fr 70px 84px 28px', gap: 10, alignItems: 'end' }}
              >
                <div>
                  <label className="field-label">Product</label>
                  <select className="input" value={l.productId} onChange={(e) => onProductChange(l.key, e.target.value)}>
                    <option value="">Select product…</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.brandName ? ` — ${p.brandName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Size</label>
                  <select
                    className="input"
                    value={l.size}
                    disabled={!l.productId || l.loading || !hasSizes}
                    onChange={(e) => patchLine(l.key, { size: e.target.value, color: '' })}
                  >
                    <option value="">{!hasSizes ? '—' : l.loading ? '…' : 'Size…'}</option>
                    {sizes
                      .filter((s) => s !== '')
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Colour</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {variant?.colorHex && (
                      <span
                        style={{ width: 16, height: 16, borderRadius: 3, flex: '0 0 auto', border: '1px solid var(--line)', background: variant.colorHex }}
                      />
                    )}
                    <select
                      className="input"
                      value={l.color}
                      disabled={!l.productId || l.loading || (hasSizes && !l.size)}
                      onChange={(e) => patchLine(l.key, { color: e.target.value })}
                    >
                      <option value="">{l.loading ? '…' : 'Colour…'}</option>
                      {colorOptions.map((v) => (
                        <option key={v.colorName} value={v.colorName} disabled={v.stock < 1}>
                          {v.colorName} ({v.stock})
                        </option>
                      ))}
                    </select>
                  </div>
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
