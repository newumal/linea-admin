import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';

function PairDeviceModal({ register, onClose }) {
  const [qrUrl, setQrUrl] = useState('');
  const [pairing, setPairing] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await apiFetch(ADMIN.posRegisterPair(register.id), { method: 'POST', auth: true });
        if (cancelled) return;
        setPairing(data.pairing ?? null);
        const url = await QRCode.toDataURL(data.qrData, { width: 280, margin: 2 });
        setQrUrl(url);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to generate pairing QR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [register.id]);

  async function copyField(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setErr('Copy failed — select text manually');
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Pair tablet — {register.name}</h2>
        <p className="admin-muted">
          Scan QR in Linea POS, or copy fields below for Manual setup. Shown once — previous token is revoked.
        </p>
        {loading ? <p className="admin-muted">Generating…</p> : null}
        {err ? <p className="admin-err">{err}</p> : null}
        {qrUrl ? (
          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <img src={qrUrl} alt="Pairing QR code" width={280} height={280} />
          </div>
        ) : null}
        {pairing ? (
          <div className="admin-pair-fields">
            <label className="field-label">Device token</label>
            <div className="admin-copy-row">
              <code className="mono admin-copy-value">{pairing.token}</code>
              <button type="button" className="btn sm" onClick={() => void copyField('token', pairing.token)}>
                {copied === 'token' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <label className="field-label" style={{ marginTop: 12 }}>
              Register ID
            </label>
            <div className="admin-copy-row">
              <code className="mono admin-copy-value">{pairing.registerId}</code>
              <button type="button" className="btn sm" onClick={() => void copyField('register', pairing.registerId)}>
                {copied === 'register' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : null}
        <button type="button" className="btn sm" style={{ marginTop: 16 }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function FavoritesModal({ register, onClose }) {
  const [selected, setSelected] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [fav, prods] = await Promise.all([
          apiFetch(ADMIN.posRegisterFavorites(register.id), { auth: true }),
          apiFetch(ADMIN.products({ limit: '100', offset: '0' }), { auth: true }),
        ]);
        if (cancelled) return;
        setSelected(fav.productIds ?? []);
        setProducts(prods.items ?? []);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [register.id]);

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return p.name?.toLowerCase().includes(needle) || p.brand?.toLowerCase().includes(needle);
  });

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 24) return prev;
      return [...prev, id];
    });
  }

  async function save() {
    setSaving(true);
    setErr('');
    try {
      await apiFetch(ADMIN.posRegisterFavorites(register.id), {
        method: 'PUT',
        body: { productIds: selected },
        auth: true,
      });
      onClose();
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Favorites — {register.name}</h2>
        <p className="admin-muted">Pin up to 24 products to the top of the register grid ({selected.length}/24).</p>
        <input
          className="input"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {loading ? <p className="admin-muted">Loading…</p> : null}
        {err ? <p className="admin-err">{err}</p> : null}
        <div className="admin-fav-grid">
          {filtered.map((p) => (
            <label key={p.id} className={`admin-fav-item ${selected.includes(p.id) ? 'selected' : ''}`}>
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn sm" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save favorites'}
          </button>
          <button type="button" className="btn sm ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffPinsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [pinForms, setPinForms] = useState({});
  const [savingId, setSavingId] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.posStaffPins(), { auth: true });
      setItems(data.items ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePin(userId) {
    const pin = pinForms[userId]?.trim();
    if (!pin || pin.length < 4) {
      setErr('PIN must be 4–8 digits');
      return;
    }
    setSavingId(userId);
    setErr('');
    try {
      await apiFetch(ADMIN.posStaffPins(), { method: 'POST', body: { userId, pin }, auth: true });
      setPinForms((f) => ({ ...f, [userId]: '' }));
      await load();
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setSavingId('');
    }
  }

  async function confirmRemove() {
    const t = removeTarget;
    setRemoveTarget(null);
    if (!t) return;
    try {
      await apiFetch(ADMIN.posStaffPin(t.userId), { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setErr(e.message || 'Remove failed');
    }
  }

  if (loading) return <p className="admin-muted">Loading staff…</p>;

  return (
    <>
      {err ? <p className="admin-err">{err}</p> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>PIN</th>
              <th>Set PIN</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.userId}>
                <td>
                  {u.name || u.email}
                  <div className="admin-muted small">{u.email}</div>
                </td>
                <td>{u.role}</td>
                <td>{u.hasPin ? <span className="badge ok">Set</span> : <span className="badge muted">None</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="input"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      placeholder="4–8 digits"
                      value={pinForms[u.userId] ?? ''}
                      onChange={(e) => setPinForms((f) => ({ ...f, [u.userId]: e.target.value.replace(/\D/g, '') }))}
                      style={{ maxWidth: 120 }}
                    />
                    <button
                      type="button"
                      className="btn sm"
                      disabled={savingId === u.userId}
                      onClick={() => void savePin(u.userId)}
                    >
                      Save
                    </button>
                  </div>
                </td>
                <td>
                  {u.hasPin ? (
                    <button type="button" className="btn sm ghost" onClick={() => setRemoveTarget(u)}>
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove PIN?"
        confirmLabel="Remove"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      >
        <p>
          Remove POS PIN for <strong>{removeTarget?.name || removeTarget?.email}</strong>?
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function PosRegisters() {
  const { hasRole } = useRole();
  const canManage = hasRole(['super_admin', 'admin']);
  const [tab, setTab] = useState('registers');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pairTarget, setPairTarget] = useState(null);
  const [favTarget, setFavTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const regs = await apiFetch(ADMIN.posRegisters(), { auth: true });
      setItems(regs.items ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRegister(e) {
    e.preventDefault();
    if (!canManage || !name.trim()) return;
    setErr('');
    try {
      await apiFetch(ADMIN.posRegisters(), {
        method: 'POST',
        body: { name: name.trim(), locationLabel: locationLabel.trim() || undefined },
        auth: true,
      });
      setName('');
      setLocationLabel('');
      await load();
    } catch (e2) {
      setErr(e2.message || 'Create failed');
    }
  }

  async function confirmDelete() {
    const t = deleteTarget;
    setDeleteTarget(null);
    if (!t) return;
    try {
      await apiFetch(ADMIN.posRegister(t.id), { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setErr(e.message || 'Delete failed');
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">Point of sale</h1>
      <p className="admin-page-sub">Registers, tablet pairing, cashier PINs, and favorites grid.</p>

      <div className="admin-tabs" style={{ marginBottom: 20 }}>
        <button type="button" className={`btn sm ${tab === 'registers' ? '' : 'ghost'}`} onClick={() => setTab('registers')}>
          Registers
        </button>
        {canManage ? (
          <button type="button" className={`btn sm ${tab === 'pins' ? '' : 'ghost'}`} onClick={() => setTab('pins')}>
            Staff PINs
          </button>
        ) : null}
      </div>

      {err ? <p className="admin-err">{err}</p> : null}

      {tab === 'pins' && canManage ? <StaffPinsPanel /> : null}

      {tab === 'registers' ? (
        <>
          {loading ? <p className="admin-muted">Loading…</p> : null}
          {!loading ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Token</th>
                    <th>Status</th>
                    {canManage ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.locationLabel || '—'}</td>
                      <td className="mono">{r.tokenPrefix ? `${r.tokenPrefix}…` : '—'}</td>
                      <td>
                        {r.isActive ? <span className="badge ok">Active</span> : <span className="badge muted">Inactive</span>}
                      </td>
                      {canManage ? (
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="btn sm" onClick={() => setPairTarget(r)}>
                              Pair tablet
                            </button>
                            <button type="button" className="btn sm ghost" onClick={() => setFavTarget(r)}>
                              Favorites
                            </button>
                            <button type="button" className="btn sm ghost" onClick={() => setDeleteTarget(r)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 ? <p className="admin-muted" style={{ padding: 16 }}>No registers yet.</p> : null}
            </div>
          ) : null}

          {canManage ? (
            <form onSubmit={createRegister} style={{ marginTop: 24, maxWidth: 420 }}>
              <h3 className="caps" style={{ marginBottom: 12 }}>
                New register
              </h3>
              <label className="field-label" htmlFor="reg-name">
                Name
              </label>
              <input
                id="reg-name"
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Front counter"
              />
              <label className="field-label" htmlFor="reg-loc" style={{ marginTop: 12, display: 'block' }}>
                Location label
              </label>
              <input
                id="reg-loc"
                className="input"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="Colombo store"
              />
              <button type="submit" className="btn sm" style={{ marginTop: 14 }}>
                Create register
              </button>
            </form>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete register?"
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      >
        <p>
          Delete register <strong>{deleteTarget?.name}</strong>? This cannot be undone.
        </p>
      </ConfirmDialog>

      {pairTarget ? <PairDeviceModal register={pairTarget} onClose={() => setPairTarget(null)} /> : null}
      {favTarget ? <FavoritesModal register={favTarget} onClose={() => setFavTarget(null)} /> : null}
    </div>
  );
}
