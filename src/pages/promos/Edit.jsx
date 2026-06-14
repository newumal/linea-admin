import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { MARKETER_ROLES } from '../../auth/navConfig.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { InfoPanel } from '../../components/TableTools.jsx';

function emptyForm() {
  return {
    code: '',
    type: 'percent',
    value: '10',
    minSubtotal: '',
    maxUses: '',
    perUserLimit: '1',
    appliesToPreorder: false,
    startsAt: '',
    endsAt: '',
    isActive: true,
    categoryIds: [],
    brandIds: [],
    minItemPrice: '',
    maxItemPrice: '',
    maxDiscountAmount: '',
    firstOrderOnly: false,
  };
}

function toggleId(list, id) {
  const set = new Set(list);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return [...set];
}

function TargetMultiSelect({ label, items, selected, disabled, onChange }) {
  if (!items.length) {
    return (
      <div>
        <div className="field-label">{label}</div>
        <p className="admin-muted" style={{ fontSize: 12, margin: 0 }}>None available.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="field-label">{label}</div>
      <div
        style={{
          maxHeight: 160,
          overflowY: 'auto',
          border: '1px solid var(--line, #ddd)',
          padding: '8px 12px',
          display: 'grid',
          gap: 6,
        }}
      >
        {items.map((item) => (
          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              disabled={disabled}
              onChange={() => onChange(toggleId(selected, item.id))}
            />
            <span>{item.name}</span>
          </label>
        ))}
      </div>
      {selected.length ? (
        <p className="admin-muted" style={{ fontSize: 12, marginTop: 6 }}>
          {selected.length} selected — leave empty to apply to all.
        </p>
      ) : (
        <p className="admin-muted" style={{ fontSize: 12, marginTop: 6 }}>
          All {label.toLowerCase()} (no filter).
        </p>
      )}
    </div>
  );
}

function fromIsoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function buildBody(form, isNew) {
  const body = {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    appliesToPreorder: form.appliesToPreorder,
    isActive: form.isActive,
    startsAt: toIsoOrNull(form.startsAt),
    endsAt: toIsoOrNull(form.endsAt),
  };

  if (form.type !== 'free_shipping') {
    body.value = Number(form.value);
  }

  body.minSubtotal = form.minSubtotal.trim() ? Number(form.minSubtotal) : null;
  body.maxUses = form.maxUses.trim() ? parseInt(form.maxUses, 10) : null;
  body.perUserLimit = form.perUserLimit.trim() ? parseInt(form.perUserLimit, 10) : null;

  body.categoryIds = form.categoryIds.length ? form.categoryIds : null;
  body.brandIds = form.brandIds.length ? form.brandIds : null;
  body.minItemPrice = form.minItemPrice.trim() ? Number(form.minItemPrice) : null;
  body.maxItemPrice = form.maxItemPrice.trim() ? Number(form.maxItemPrice) : null;
  body.maxDiscountAmount = form.maxDiscountAmount.trim() ? Number(form.maxDiscountAmount) : null;
  body.firstOrderOnly = form.firstOrderOnly;

  if (!isNew) {
    const patch = { ...body };
    if (!form.code.trim()) delete patch.code;
    return patch;
  }
  return body;
}

export default function PromoEdit() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useRole();
  const canWrite = hasRole(MARKETER_ROLES);

  const isNew = routeId === 'new';
  const promoId = isNew ? null : routeId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [usedCount, setUsedCount] = useState(0);
  const [status, setStatus] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const codeLocked = !isNew && usedCount > 0;

  const loadPromo = useCallback(async () => {
    if (!promoId) return;
    setLoading(true);
    setErr('');
    try {
      const p = await apiFetch(ADMIN.promo(promoId), { auth: true });
      setForm({
        code: p.code ?? '',
        type: p.type ?? 'percent',
        value: p.type === 'free_shipping' ? '' : String(p.value ?? ''),
        minSubtotal: p.minSubtotal != null ? String(p.minSubtotal) : '',
        maxUses: p.maxUses != null ? String(p.maxUses) : '',
        perUserLimit: p.perUserLimit != null ? String(p.perUserLimit) : '',
        appliesToPreorder: !!p.appliesToPreorder,
        startsAt: fromIsoToLocalInput(p.startsAt),
        endsAt: fromIsoToLocalInput(p.endsAt),
        isActive: p.isActive !== false,
        categoryIds: p.categoryIds ?? [],
        brandIds: p.brandIds ?? [],
        minItemPrice: p.minItemPrice != null ? String(p.minItemPrice) : '',
        maxItemPrice: p.maxItemPrice != null ? String(p.maxItemPrice) : '',
        maxDiscountAmount: p.maxDiscountAmount != null ? String(p.maxDiscountAmount) : '',
        firstOrderOnly: !!p.firstOrderOnly,
      });
      setUsedCount(p.usedCount ?? 0);
      setStatus(p.status ?? '');
    } catch (e) {
      setErr(e.message || 'Failed to load promo');
    } finally {
      setLoading(false);
    }
  }, [promoId]);

  const loadMeta = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([
        apiFetch(ADMIN.categories(), { auth: true }),
        apiFetch(ADMIN.brands(), { auth: true }),
      ]);
      setCategories(c.items ?? []);
      setBrands(b.items ?? []);
    } catch {
      /* optional — targeting pickers stay empty */
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- mount load */
  useEffect(() => {
    void loadMeta();
    void loadPromo();
  }, [loadMeta, loadPromo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function save(e) {
    e.preventDefault();
    if (!canWrite) return;
    setErr('');
    setSaving(true);
    try {
      const body = buildBody(form, isNew);
      if (!isNew && codeLocked) delete body.code;
      if (isNew) {
        const created = await apiFetch(ADMIN.promos(), { method: 'POST', body, auth: true });
        navigate(`/promos/${created.id}`, { replace: true });
      } else {
        await apiFetch(ADMIN.promo(promoId), { method: 'PATCH', body, auth: true });
        await loadPromo();
      }
    } catch (e2) {
      setErr(e2.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!canWrite || !promoId) return;
    setErr('');
    try {
      const res = await apiFetch(ADMIN.promo(promoId), { method: 'DELETE', auth: true });
      setDeleteOpen(false);
      navigate('/promos', {
        replace: true,
        state: { info: res.mode === 'deleted' ? 'Promo deleted.' : 'Promo deactivated (has redemptions).' },
      });
    } catch (e) {
      setErr(e.message || 'Delete failed');
      setDeleteOpen(false);
    }
  }

  if (loading) return <p className="admin-muted">Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link to="/promos" className="mono admin-muted" style={{ fontSize: 12 }}>
            ← Promos
          </Link>
          <h1 className="admin-page-title" style={{ marginTop: 8 }}>
            {isNew ? 'New promo' : form.code || 'Edit promo'}
          </h1>
          {!isNew && status ? (
            <p className="admin-page-sub">
              Status: <span className="mono">{status}</span>
              {usedCount > 0 ? ` · ${usedCount} redemption${usedCount === 1 ? '' : 's'}` : ''}
            </p>
          ) : (
            <p className="admin-page-sub">Create a discount code for checkout.</p>
          )}
        </div>
        {!isNew ? (
          <Link className="btn ghost sm" to={`/promos/redemptions?code=${encodeURIComponent(form.code)}`}>
            View redemptions
          </Link>
        ) : null}
      </div>

      <InfoPanel title="Rules">
        <p style={{ margin: 0 }}>
          Code is locked after the first redemption. Percent promos are 1–100. Fixed promos are a dollar amount off.
          Leave schedule fields empty for no start/end window. Category/brand filters and item price bands limit which
          cart lines receive the discount; min subtotal still applies to the whole cart.
        </p>
      </InfoPanel>

      {err ? <p className="admin-err">{err}</p> : null}

      <form onSubmit={save} style={{ maxWidth: 640, marginTop: 24 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label className="field-label" htmlFor="promo-code">Code</label>
            <input
              id="promo-code"
              className="input mono"
              value={form.code}
              disabled={!canWrite || codeLocked}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="SUMMER20"
              required
            />
            {codeLocked ? (
              <p className="admin-muted" style={{ fontSize: 12, marginTop: 6 }}>
                Code cannot change after redemptions exist.
              </p>
            ) : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="field-label" htmlFor="promo-type">Type</label>
              <select
                id="promo-type"
                className="input"
                value={form.type}
                disabled={!canWrite}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </div>
            {form.type !== 'free_shipping' ? (
              <div>
                <label className="field-label" htmlFor="promo-value">
                  {form.type === 'percent' ? 'Percent (1–100)' : 'Amount ($)'}
                </label>
                <input
                  id="promo-value"
                  className="input mono"
                  type="number"
                  min={form.type === 'percent' ? 1 : 0.01}
                  max={form.type === 'percent' ? 100 : undefined}
                  step={form.type === 'percent' ? 1 : 0.01}
                  value={form.value}
                  disabled={!canWrite}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  required
                />
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label className="field-label" htmlFor="promo-min">Min subtotal ($)</label>
              <input
                id="promo-min"
                className="input mono"
                type="number"
                min="0"
                step="0.01"
                value={form.minSubtotal}
                disabled={!canWrite}
                onChange={(e) => setForm((f) => ({ ...f, minSubtotal: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="promo-max">Max uses</label>
              <input
                id="promo-max"
                className="input mono"
                type="number"
                min="1"
                value={form.maxUses}
                disabled={!canWrite}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="promo-per-user">Per user limit</label>
              <input
                id="promo-per-user"
                className="input mono"
                type="number"
                min="1"
                value={form.perUserLimit}
                disabled={!canWrite}
                onChange={(e) => setForm((f) => ({ ...f, perUserLimit: e.target.value }))}
                placeholder="1"
              />
            </div>
          </div>

          <fieldset style={{ border: '1px solid var(--line, #ddd)', padding: 16, margin: 0 }}>
            <legend className="field-label" style={{ padding: '0 8px' }}>Targeting (optional)</legend>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <TargetMultiSelect
                  label="Categories"
                  items={categories}
                  selected={form.categoryIds}
                  disabled={!canWrite}
                  onChange={(ids) => setForm((f) => ({ ...f, categoryIds: ids }))}
                />
                <TargetMultiSelect
                  label="Brands"
                  items={brands}
                  selected={form.brandIds}
                  disabled={!canWrite}
                  onChange={(ids) => setForm((f) => ({ ...f, brandIds: ids }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label className="field-label" htmlFor="promo-min-item">Min item price ($)</label>
                  <input
                    id="promo-min-item"
                    className="input mono"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minItemPrice}
                    disabled={!canWrite}
                    onChange={(e) => setForm((f) => ({ ...f, minItemPrice: e.target.value }))}
                    placeholder="Any"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="promo-max-item">Max item price ($)</label>
                  <input
                    id="promo-max-item"
                    className="input mono"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxItemPrice}
                    disabled={!canWrite}
                    onChange={(e) => setForm((f) => ({ ...f, maxItemPrice: e.target.value }))}
                    placeholder="Any"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="promo-max-disc">Max discount ($)</label>
                  <input
                    id="promo-max-disc"
                    className="input mono"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDiscountAmount}
                    disabled={!canWrite || form.type === 'free_shipping'}
                    onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))}
                    placeholder="Uncapped"
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.firstOrderOnly}
                  disabled={!canWrite}
                  onChange={(e) => setForm((f) => ({ ...f, firstOrderOnly: e.target.checked }))}
                />
                <span>First order only (signed-in customers)</span>
              </label>
            </div>
          </fieldset>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="field-label" htmlFor="promo-starts">Starts</label>
              <input
                id="promo-starts"
                className="input"
                type="datetime-local"
                value={form.startsAt}
                disabled={!canWrite}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="promo-ends">Ends</label>
              <input
                id="promo-ends"
                className="input"
                type="datetime-local"
                value={form.endsAt}
                disabled={!canWrite}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.appliesToPreorder}
              disabled={!canWrite}
              onChange={(e) => setForm((f) => ({ ...f, appliesToPreorder: e.target.checked }))}
            />
            <span>Applies to pre-orders</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.isActive}
              disabled={!canWrite}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            <span>Enabled</span>
          </label>
        </div>

        {canWrite ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <button type="submit" className="btn sm" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create promo' : 'Save changes'}
            </button>
            {!isNew ? (
              <button type="button" className="btn ghost sm" onClick={() => setDeleteOpen(true)}>
                Delete / deactivate
              </button>
            ) : null}
          </div>
        ) : (
          <p className="admin-muted" style={{ marginTop: 24 }}>
            Read-only — marketer role required to edit promos.
          </p>
        )}
      </form>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete promo?"
        confirmLabel="Confirm"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
      >
        <p>
          Promos with redemptions are deactivated instead of deleted. This cannot be undone from the admin UI.
        </p>
      </ConfirmDialog>
    </div>
  );
}
