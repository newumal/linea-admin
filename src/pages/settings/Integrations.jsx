import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { InfoPanel, PaginationControls, TableCount } from '../../components/TableTools.jsx';
import { IconButton } from '../../components/IconButton.jsx';
import { CopyButton } from '../../components/CopyButton.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';

const ADMIN_ROLES = ['super_admin', 'admin'];
const SCOPE_OPTIONS = [
  { value: 'catalog:read', label: 'Catalog read', hint: 'Read products, variants, stock & images' },
  { value: 'orders:read', label: 'Orders read', hint: 'Read orders & status' },
  { value: 'orders:write', label: 'Orders write', hint: 'Create orders via bot integration' },
  { value: 'pos:read', label: 'POS read', hint: 'POS terminal catalog & cashier login' },
  { value: 'pos:write', label: 'POS write', hint: 'POS terminal create sales & sync' },
];
const BOT_SCOPE_OPTIONS = SCOPE_OPTIONS.filter((s) => !s.value.startsWith('pos:'));

const DEFAULT_BOT_CONFIG = { bot: { includePosOrders: false, webhookUrl: null, webhookSecret: null } };

function isPosToken(token) {
  const scopes = token.scopes ?? [];
  return scopes.length > 0 && scopes.every((s) => s.startsWith('pos:'));
}

function sortTokens(rows) {
  return [...rows].sort((a, b) => {
    const aRev = a.revokedAt ? 1 : 0;
    const bRev = b.revokedAt ? 1 : 0;
    if (aRev !== bRev) return aRev - bRev;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function TokenTabBar({ tab, onTab, botCount, posCount }) {
  return (
    <div className="admin-tabs" style={{ marginBottom: 16 }}>
      <button
        type="button"
        className={`btn sm ${tab === 'bot' ? '' : 'ghost'}`}
        onClick={() => onTab('bot')}
      >
        Bot tokens ({botCount})
      </button>
      <button
        type="button"
        className={`btn sm ${tab === 'pos' ? '' : 'ghost'}`}
        onClick={() => onTab('pos')}
      >
        POS device tokens ({posCount})
      </button>
    </div>
  );
}

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : '—';
}

function botConfigFromToken(token) {
  return token?.config ?? DEFAULT_BOT_CONFIG;
}

function hasWebhookConfig(token) {
  const bot = botConfigFromToken(token).bot ?? {};
  return Boolean(bot.webhookUrl?.trim() && bot.webhookSecret?.trim());
}

function posOrdersLabel(token) {
  const includePos = Boolean(botConfigFromToken(token).bot.includePosOrders);
  const hasOrdersRead = (token.scopes ?? []).includes('orders:read');
  if (!hasOrdersRead) {
    return includePos ? 'POS on (needs orders:read)' : 'POS off (needs orders:read)';
  }
  return includePos ? 'POS visible' : 'POS hidden';
}

function webhookLabel(token) {
  const hasOrdersRead = (token.scopes ?? []).includes('orders:read');
  if (!hasOrdersRead) return 'Needs orders:read';
  return hasWebhookConfig(token) ? 'WA notify on' : 'WA notify pending';
}

function BotPosOrderOption({ includePosOrders, onChange, idPrefix, ordersReadEnabled }) {
  return (
    <label
      htmlFor={`${idPrefix}-pos-orders`}
      style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: ordersReadEnabled ? 1 : 0.65 }}
    >
      <input
        id={`${idPrefix}-pos-orders`}
        type="checkbox"
        checked={includePosOrders}
        disabled={!ordersReadEnabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <strong>Include in-store (POS) orders</strong>
        <span className="admin-muted" style={{ display: 'block', marginTop: 2 }}>
          When off, the bot operator console and integration order API omit counter sales tagged{' '}
          <span className="mono">source=pos</span>. Manage POS in Admin → Orders instead.
        </span>
        {!ordersReadEnabled ? (
          <span className="admin-muted" style={{ display: 'block', marginTop: 6 }}>
            Check <span className="mono">orders:read</span> above to enable this option.
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Shown on create — webhooks are configured after BotForge connects. */
function BotWebhookSetupNotice({ compact }) {
  return (
    <div
      style={{
        marginTop: compact ? 10 : 14,
        padding: '12px 14px',
        border: '1px dashed var(--border, #d1d5db)',
        borderRadius: 8,
        background: 'var(--surface-2, #fafafa)',
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Order status → WhatsApp (later)</div>
      <p className="admin-muted" style={{ margin: '0 0 8px' }}>
        Webhook URL and secret come from <strong>BotForge</strong> after you connect this token there.
        You cannot set them at creation time.
      </p>
      <ol className="admin-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
        <li>Create this token and paste it into BotForge → Integrations</li>
        <li>In BotForge, enable <strong>Order status WhatsApp notifications</strong></li>
        <li>Return here → <strong>Edit token</strong> → paste webhook URL + secret</li>
      </ol>
    </div>
  );
}

/** Edit only — paste values copied from BotForge Integrations. */
function BotWebhookConfigFields({
  webhookUrl,
  onWebhookUrlChange,
  webhookSecret,
  onWebhookSecretChange,
  idPrefix,
  hasExistingSecret,
}) {
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border, #e5e7eb)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Order status webhooks → BotForge</div>
      <p className="admin-muted" style={{ margin: '0 0 10px', fontSize: 13 }}>
        Paste from <strong>BotForge → Integrations</strong> (Linea connected + notifications enabled).
        Linea POSTs to this URL when an order status changes.
      </p>
      <div style={{ marginBottom: 10 }}>
        <label className="field-label" htmlFor={`${idPrefix}-webhook-url`}>
          Webhook URL
        </label>
        <input
          id={`${idPrefix}-webhook-url`}
          className="input mono"
          placeholder="http://localhost:3002/webhooks/linea/…"
          value={webhookUrl}
          onChange={(e) => onWebhookUrlChange(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-webhook-secret`}>
          Webhook secret (HMAC)
        </label>
        <input
          id={`${idPrefix}-webhook-secret`}
          className="input mono"
          type="password"
          autoComplete="off"
          placeholder={hasExistingSecret ? 'Leave blank to keep saved secret' : 'Paste secret from BotForge'}
          value={webhookSecret}
          onChange={(e) => onWebhookSecretChange(e.target.value)}
        />
        {hasExistingSecret ? (
          <span className="admin-muted" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
            A secret is already saved. Paste only to replace it.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function BotIntegrationPanel({ children, title = 'Bot integration' }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: '12px 14px',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 8,
        background: 'var(--surface-2, #fafafa)',
      }}
    >
      <div className="caps" style={{ marginBottom: 8, fontSize: 12 }}>{title}</div>
      {children}
    </div>
  );
}

export default function SettingsIntegrations() {
  const { hasRole } = useRole();
  const canManage = hasRole(ADMIN_ROLES);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState(['catalog:read']);
  const [includePosOrders, setIncludePosOrders] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editScopes, setEditScopes] = useState([]);
  const [editIncludePosOrders, setEditIncludePosOrders] = useState(false);
  const [editWebhookUrl, setEditWebhookUrl] = useState('');
  const [editWebhookSecret, setEditWebhookSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('bot');
  const [page, setPage] = useState({ limit: 25, offset: 0 });
  const [showRevoked, setShowRevoked] = useState(false);

  const createHasOrdersRead = scopes.includes('orders:read');
  const editHasOrdersRead = editScopes.includes('orders:read');

  const botItems = useMemo(() => sortTokens(items.filter((t) => !isPosToken(t))), [items]);
  const posItems = useMemo(() => sortTokens(items.filter((t) => isPosToken(t))), [items]);

  const tabItems = tab === 'pos' ? posItems : botItems;
  const visibleItems = useMemo(() => {
    const filtered = showRevoked ? tabItems : tabItems.filter((t) => !t.revokedAt);
    return filtered.slice(page.offset, page.offset + page.limit);
  }, [tabItems, showRevoked, page.offset, page.limit]);

  const visibleTotal = useMemo(() => {
    return (showRevoked ? tabItems : tabItems.filter((t) => !t.revokedAt)).length;
  }, [tabItems, showRevoked]);

  function switchTab(next) {
    setTab(next);
    setPage((p) => ({ ...p, offset: 0 }));
  }

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

  function toggleScope(current, value, setter) {
    setter((s) => (s.includes(value) ? s.filter((x) => x !== value) : [...s, value]));
  }

  function botConfigPayload(includePos, url, secret, existingConfig, isCreate) {
    const bot = { includePosOrders: includePos };
    if (isCreate) {
      bot.webhookUrl = null;
      bot.webhookSecret = null;
      return { bot };
    }
    bot.webhookUrl = url.trim() || null;
    const trimmedSecret = secret.trim();
    if (trimmedSecret) {
      bot.webhookSecret = trimmedSecret;
    } else if (existingConfig?.bot?.webhookSecret) {
      bot.webhookSecret = existingConfig.bot.webhookSecret;
    } else {
      bot.webhookSecret = null;
    }
    return { bot };
  }

  function openEdit(token) {
    const cfg = botConfigFromToken(token).bot ?? {};
    setEditTarget(token);
    setEditName(token.name);
    setEditScopes(token.scopes ?? []);
    setEditIncludePosOrders(Boolean(cfg.includePosOrders));
    setEditWebhookUrl(cfg.webhookUrl ?? '');
    setEditWebhookSecret('');
    setErr('');
  }

  function closeEdit() {
    setEditTarget(null);
    setSaving(false);
  }

  async function createToken(e) {
    e.preventDefault();
    if (!canManage || !name.trim() || scopes.length === 0) return;
    setErr('');
    setCreating(true);
    try {
      const body = {
        name: name.trim(),
        scopes,
        config: botConfigPayload(includePosOrders, '', '', null, true),
      };
      const res = await apiFetch(ADMIN.integrationTokens(), {
        method: 'POST',
        body,
        auth: true,
      });
      setRevealed({ token: res.token, name: res.name, id: res.id });
      setName('');
      setScopes(['catalog:read']);
      setIncludePosOrders(false);
      await load();
    } catch (e2) {
      setErr(e2.message || 'Failed to create token');
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editTarget || !editName.trim() || editScopes.length === 0) return;
    setErr('');
    setSaving(true);
    try {
      await apiFetch(ADMIN.integrationToken(editTarget.id), {
        method: 'PATCH',
        body: {
          name: editName.trim(),
          scopes: editScopes,
          config: botConfigPayload(
            editIncludePosOrders,
            editWebhookUrl,
            editWebhookSecret,
            botConfigFromToken(editTarget),
            false,
          ),
        },
        auth: true,
      });
      closeEdit();
      await load();
    } catch (e2) {
      setErr(e2.message || 'Failed to update token');
    } finally {
      setSaving(false);
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
          <strong>Bot tokens</strong> connect BotForge (catalog, orders, WhatsApp notifications).
          <strong> POS device tokens</strong> are created automatically when you pair a register
          in Settings → Point of sale — they are listed separately and usually should not be edited here.
        </p>
      </InfoPanel>

      {err ? <p className="admin-err">{err}</p> : null}
      {loading ? <p className="admin-muted">Loading…</p> : null}

      {!loading ? (
        <>
          <TokenTabBar tab={tab} onTab={switchTab} botCount={botItems.length} posCount={posItems.length} />

          <div className="admin-toolbar" style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={showRevoked}
                onChange={(e) => {
                  setShowRevoked(e.target.checked);
                  setPage((p) => ({ ...p, offset: 0 }));
                }}
              />
              Show revoked
            </label>
          </div>

          {tab === 'pos' ? (
            <p className="admin-muted" style={{ marginBottom: 12, fontSize: 13 }}>
              Pair or rotate tokens in <strong>Settings → Point of sale → Registers</strong>. Revoked
              entries are kept for audit when a register is re-paired.
            </p>
          ) : null}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Token</th>
                  {tab === 'bot' ? (
                    <>
                      <th>Scopes</th>
                      <th>Bot orders</th>
                      <th>WA notify</th>
                    </>
                  ) : (
                    <th>Scopes</th>
                  )}
                  <th>Last used</th>
                  <th>Created</th>
                  <th>Status</th>
                  {canManage ? <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={tab === 'bot' ? (canManage ? 9 : 8) : canManage ? 7 : 6} className="admin-muted">
                      {tab === 'bot' ? 'No bot tokens yet — create one below.' : 'No POS tokens — pair a register first.'}
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((t) => {
                    const active = !t.revokedAt;
                    const posLabel = posOrdersLabel(t);
                    const waLabel = webhookLabel(t);
                    const waConfigured = hasWebhookConfig(t);
                    return (
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td className="mono">{t.tokenPrefix}…</td>
                        {tab === 'bot' ? (
                          <>
                            <td>{(t.scopes ?? []).join(', ')}</td>
                            <td>{posLabel ? <span className="badge muted">{posLabel}</span> : '—'}</td>
                            <td>
                              <span className={`badge ${waConfigured ? 'ok' : 'muted'}`}>{waLabel}</span>
                            </td>
                          </>
                        ) : (
                          <td className="mono">{(t.scopes ?? []).join(', ')}</td>
                        )}
                        <td>{fmt(t.lastUsedAt)}</td>
                        <td>{fmt(t.createdAt)}</td>
                        <td>
                          {active ? (
                            <span className="badge ok">Active</span>
                          ) : (
                            <span className="badge muted">Revoked</span>
                          )}
                        </td>
                        {canManage ? (
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div className="admin-row-actions">
                              {active ? (
                                <>
                                  {tab === 'bot' ? (
                                    <IconButton icon="edit" label="Edit token" onClick={() => openEdit(t)} />
                                  ) : null}
                                  <IconButton icon="archive" label="Revoke token" onClick={() => setRevokeTarget(t)} />
                                </>
                              ) : (
                                <span className="admin-muted">—</span>
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <TableCount shown={visibleItems.length} total={visibleTotal} offset={page.offset} label="tokens" />
            <PaginationControls
              limit={page.limit}
              offset={page.offset}
              total={visibleTotal}
              onPage={(nextOffset) => setPage((p) => ({ ...p, offset: nextOffset }))}
              onLimit={(nextLimit) => setPage({ limit: nextLimit, offset: 0 })}
            />
          </div>
        </>
      ) : null}

      {canManage && tab === 'bot' ? (
        <form onSubmit={createToken} style={{ marginTop: 24, maxWidth: 560 }}>
          <h3 className="caps" style={{ marginBottom: 12 }}>New bot token</h3>
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
              {BOT_SCOPE_OPTIONS.map((s) => (
                <label key={s.value} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.value)}
                    onChange={() => toggleScope(scopes, s.value, setScopes)}
                  />
                  <span>
                    <span className="mono">{s.value}</span> — <span className="admin-muted">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <BotIntegrationPanel>
            <BotPosOrderOption
              idPrefix="create"
              includePosOrders={includePosOrders}
              onChange={setIncludePosOrders}
              ordersReadEnabled={createHasOrdersRead}
            />
            <BotWebhookSetupNotice />
          </BotIntegrationPanel>
          <button type="submit" className="btn sm" style={{ marginTop: 14 }} disabled={creating || !name.trim() || scopes.length === 0}>
            {creating ? 'Creating…' : 'Create bot token'}
          </button>
        </form>
      ) : null}

      {editTarget ? (
        <div className="admin-dialog-backdrop" role="presentation">
          <form className="admin-dialog" role="dialog" aria-modal="true" style={{ maxWidth: 560 }} onSubmit={saveEdit}>
            <h3>Edit token</h3>
            <p className="admin-muted">
              Update scopes and bot options for <strong>{editTarget.name}</strong>. The API token
              secret cannot be changed — revoke and create a new token to rotate it.
            </p>
            <div style={{ marginTop: 12 }}>
              <label className="field-label" htmlFor="edit-tok-name">Name</label>
              <input
                id="edit-tok-name"
                className="input"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="field-label">Scopes</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {BOT_SCOPE_OPTIONS.map((s) => (
                  <label key={s.value} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <input
                      type="checkbox"
                      checked={editScopes.includes(s.value)}
                      onChange={() => toggleScope(editScopes, s.value, setEditScopes)}
                    />
                    <span>
                      <span className="mono">{s.value}</span> — <span className="admin-muted">{s.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <BotIntegrationPanel>
              <BotPosOrderOption
                idPrefix="edit"
                includePosOrders={editIncludePosOrders}
                onChange={setEditIncludePosOrders}
                ordersReadEnabled={editHasOrdersRead}
              />
              {editHasOrdersRead ? (
                <BotWebhookConfigFields
                  idPrefix="edit"
                  webhookUrl={editWebhookUrl}
                  onWebhookUrlChange={setEditWebhookUrl}
                  webhookSecret={editWebhookSecret}
                  onWebhookSecretChange={setEditWebhookSecret}
                  hasExistingSecret={Boolean(botConfigFromToken(editTarget).bot?.webhookSecret)}
                />
              ) : (
                <p className="admin-muted" style={{ marginTop: 12, fontSize: 13 }}>
                  Add <span className="mono">orders:read</span> to configure order-status webhooks.
                </p>
              )}
            </BotIntegrationPanel>
            <div className="admin-dialog-actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn sm ghost" onClick={closeEdit} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn sm" disabled={saving || !editName.trim() || editScopes.length === 0}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

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
            <BotWebhookSetupNotice compact />
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
