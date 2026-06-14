import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { CUSTOMER_ADMIN_ROLES } from '../../auth/navConfig.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { InfoPanel } from '../../components/TableTools.jsx';

function fmt(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(ts);
  }
}

function money(n) {
  return `$${Number(n ?? 0).toFixed(2)}`;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const { hasRole, role } = useRole();
  const canEditTier = hasRole(CUSTOMER_ADMIN_ROLES);
  const canImpersonate = role === 'super_admin';

  const [data, setData] = useState(null);
  const [tier, setTier] = useState('standard');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [tierSaving, setTierSaving] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr('');
    try {
      const json = await apiFetch(ADMIN.customer(id), { auth: true });
      setData(json);
      setTier(json.tier || 'standard');
    } catch (e) {
      setErr(e.message || 'Failed to load customer');
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

  async function saveTier() {
    if (!canEditTier || !id) return;
    setTierSaving(true);
    setErr('');
    setInfo('');
    try {
      await apiFetch(ADMIN.customerTier(id), { method: 'PATCH', body: { tier }, auth: true });
      setInfo('Tier updated.');
      await load();
    } catch (e) {
      setErr(e.message || 'Tier update failed');
    } finally {
      setTierSaving(false);
    }
  }

  async function confirmImpersonate() {
    if (!canImpersonate || !id) return;
    setImpersonating(true);
    setErr('');
    try {
      const res = await apiFetch(ADMIN.customerImpersonate(id), { method: 'POST', auth: true });
      setImpersonateOpen(false);
      window.open(res.storefrontUrl, '_blank', 'noopener,noreferrer');
      setInfo(`Opened storefront as ${res.customer?.email || 'customer'} (${Math.round((res.expiresInSec || 900) / 60)} min session).`);
    } catch (e) {
      setErr(e.message || 'Impersonation failed');
    } finally {
      setImpersonating(false);
    }
  }

  if (!id) return <p className="admin-err">Missing customer id</p>;

  return (
    <div>
      <Link to="/customers" className="mono admin-muted" style={{ fontSize: 12 }}>
        ← Customers
      </Link>
      <h1 className="admin-page-title" style={{ marginTop: 8 }}>
        {data?.name || data?.email || 'Customer'}
      </h1>
      {loading ? <p className="admin-muted">Loading…</p> : null}
      {err ? <p className="admin-err">{err}</p> : null}
      {info ? <p className="admin-muted" style={{ marginTop: 12 }}>{info}</p> : null}

      {!loading && data ? (
        <>
          <p className="admin-page-sub">
            <span className="mono">{data.email}</span>
            {data.phone ? ` · ${data.phone}` : ''}
            {data.memberSince ? ` · member since ${fmt(data.memberSince)}` : ''}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, margin: '24px 0 32px' }}>
            <StatCard label="Orders" value={String(data.stats?.orderCount ?? 0)} />
            <StatCard label="LTV" value={money(data.stats?.ltv)} />
            <StatCard label="AOV" value={money(data.stats?.aov)} />
            <StatCard label="Last order" value={fmt(data.stats?.lastOrderAt)} small />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start', marginBottom: 32 }}>
            <div>
              <h2 className="caps" style={{ marginBottom: 12 }}>Profile</h2>
              <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px', fontSize: 14 }}>
                <dt className="admin-muted">Email verified</dt>
                <dd>{data.emailVerified ? 'Yes' : 'No'}</dd>
                <dt className="admin-muted">Phone verified</dt>
                <dd>{data.phoneVerified ? 'Yes' : 'No'}</dd>
                <dt className="admin-muted">Newsletter</dt>
                <dd>{data.newsletterOpt ? 'Opted in' : 'No'}</dd>
                <dt className="admin-muted">Created</dt>
                <dd className="mono">{fmt(data.createdAt)}</dd>
              </dl>
            </div>

            <div>
              <h2 className="caps" style={{ marginBottom: 12 }}>Tier</h2>
              {canEditTier ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select className="input" value={tier} onChange={(e) => setTier(e.target.value)} style={{ maxWidth: 200 }}>
                    <option value="standard">Standard</option>
                    <option value="vip">VIP</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                  <button type="button" className="btn sm" disabled={tierSaving || tier === data.tier} onClick={() => void saveTier()}>
                    {tierSaving ? 'Saving…' : 'Save tier'}
                  </button>
                </div>
              ) : (
                <p className="mono">{data.tier}</p>
              )}

              {canImpersonate ? (
                <div style={{ marginTop: 24 }}>
                  <InfoPanel title="Support impersonation">
                    <p style={{ margin: '0 0 12px' }}>
                      Opens the storefront in a new tab signed in as this customer. Session expires in ~15 minutes. Audited.
                    </p>
                    <button type="button" className="btn ghost sm" onClick={() => setImpersonateOpen(true)}>
                      Impersonate on storefront
                    </button>
                  </InfoPanel>
                </div>
              ) : null}
            </div>
          </div>

          <h2 className="caps" style={{ marginBottom: 12 }}>Recent orders</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentOrders ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-muted">No orders yet.</td>
                  </tr>
                ) : (
                  data.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/orders/${o.id}`} className="mono">
                          {o.orderCode}
                        </Link>
                      </td>
                      <td className="mono">{o.status}</td>
                      <td>{money(o.totalGrand)}</td>
                      <td className="mono">{fmt(o.placedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={impersonateOpen}
        title="Impersonate customer?"
        confirmLabel={impersonating ? 'Opening…' : 'Open storefront'}
        onCancel={() => setImpersonateOpen(false)}
        onConfirm={() => void confirmImpersonate()}
      >
        <p>
          You will be signed in as <strong>{data?.email}</strong> on the storefront. Use only for support — action is logged.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <div style={{ padding: 16, border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
      <div className="field-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: small ? 13 : 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
