import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { InfoPanel } from '../../components/TableTools.jsx';
import { IconButton } from '../../components/IconButton.jsx';
import { CopyButton } from '../../components/CopyButton.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';

const ADMIN_ROLES = ['super_admin', 'admin'];
const SCOPE_OPTIONS = [
  { value: 'catalog:read', label: 'Catalog read', hint: 'Read products, variants, stock & images' },
  { value: 'orders:read', label: 'Orders read', hint: 'Read orders & status (future)' },
  { value: 'orders:write', label: 'Orders write', hint: 'Create orders & change status (future)' },
];

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : '—';
}

export default function SettingsIntegrations() {
  const { hasRole } = useRole();
  const canManage = hasRole(ADMIN_ROLES);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState(['catalog:read']);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState(null); // { token, name } — shown once
  const [revokeTarget, setRevokeTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.integrationTokens(), { auth: true });
      setItems(data.items ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- mount load */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleScope(value) {
    setScopes((s) => (s.includes(value) ? s.filter((x) => x !== value) : [...s, value]));
  }

  async function createToken(e) {
    e.preventDefault();
    if (!canManage || !name.trim() || scopes.length === 0) return;
    setErr('');
    setCreating(true);
    try {
      const res = await apiFetch(ADMIN.integrationTokens(), {
        method: 'POST',
        body: { name: name.trim(), scopes },
        auth: true,
      });
      setRevealed({ token: res.token, name: res.name }); // full token returned ONCE
      setName('');
      setScopes(['catalog:read']);
      await load();
    } catch (e2) {
      setErr(e2.message || 'Failed to create token');
    } finally {
      setCreating(false);
    }
  }

  async function confirmRevoke() {
    const target = revokeTarget;
    setRevokeTarget(null);
    if (!target) return;
    setErr('');
    try {
      await apiFetch(ADMIN.integrationToken(target.id), { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setErr(e.message || 'Revoke failed');
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">API tokens</h1>
      <p className="admin-page-sub">
        Scoped tokens that let external apps (e.g. the BotForge chat bot) read this store
        through the integration API.
      </p>
      <InfoPanel title="How integration tokens work">
        <p>
          A token is a machine credential — it is <strong>not</strong> a login. It is shown{' '}
          <strong>once</strong> at creation; copy it then and paste it into the connecting app.
          You can revoke a token at any time and it stops working immediately. Each token is
          limited to the <span className="mono">scopes</span> you grant.
        </p>
      </InfoPanel>

      {err ? <p className="admin-err">{err}</p> : null}
      {loading ? <p className="admin-muted">Loading…</p> : null}

      {!loading ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Token</th>
                <th>Scopes</th>
                <th>Last used</th>
                <th>Created</th>
                <th>Status</th>
                {canManage ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const active = !t.revokedAt;
                return (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td className="mono">{t.tokenPrefix}…</td>
                    <td>{(t.scopes ?? []).join(', ')}</td>
                    <td>{fmt(t.lastUsedAt)}</td>
                    <td>{fmt(t.createdAt)}</td>
                    <td>{active ? <span className="badge ok">Active</span> : <span className="badge muted">Revoked</span>}</td>
                    {canManage ? (
                      <td>
                        <div className="admin-row-actions">
                          {active ? (
                            <IconButton icon="archive" label="Revoke token" onClick={() => setRevokeTarget(t)} />
                          ) : (
                            <span className="admin-muted">—</span>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 ? (
            <p className="admin-muted" style={{ padding: 16 }}>No tokens yet.</p>
          ) : null}
        </div>
      ) : null}

      {canManage ? (
        <form onSubmit={createToken} style={{ marginTop: 24, maxWidth: 520 }}>
          <h3 className="caps" style={{ marginBottom: 12 }}>New token</h3>
          <div>
            <label className="field-label" htmlFor="tok-name">Name</label>
            <input
              id="tok-name"
              className="input"
              placeholder="e.g. BotForge bot"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <span className="field-label">Scopes</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {SCOPE_OPTIONS.map((s) => (
                <label key={s.value} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                  />
                  <span>
                    <span className="mono">{s.value}</span> — <span className="admin-muted">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn sm" style={{ marginTop: 14 }} disabled={creating || !name.trim() || scopes.length === 0}>
            {creating ? 'Creating…' : 'Create token'}
          </button>
        </form>
      ) : null}

      {/* One-time token reveal */}
      {revealed ? (
        <div className="admin-dialog-backdrop" role="presentation">
          <div className="admin-dialog" role="dialog" aria-modal="true" style={{ maxWidth: 560 }}>
            <h3>Copy your token now</h3>
            <p className="admin-muted">
              This is the only time <strong>{revealed.name}</strong> will be shown. Store it securely —
              if you lose it, revoke it and create a new one.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                padding: '10px 12px',
                background: 'var(--surface-2, #f4f4f5)',
                borderRadius: 8,
              }}
            >
              <code className="mono" style={{ wordBreak: 'break-all', flex: 1 }}>{revealed.token}</code>
              <CopyButton value={revealed.token} label="Copy token" />
            </div>
            <div className="admin-dialog-actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn sm" onClick={() => setRevealed(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke token?"
        confirmLabel="Revoke"
        onConfirm={() => void confirmRevoke()}
        onCancel={() => setRevokeTarget(null)}
      >
        <p>
          Revoking <strong>{revokeTarget?.name}</strong> stops it working immediately. Any app using it
          will lose access. This cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}
