import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { STAFF_ROLES } from '../../auth/navConfig.js';
import { useRole } from '../../auth/useRole.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { PaginationControls, TableCount } from '../../components/TableTools.jsx';

const ROLE_LABELS = {
  super_admin: 'Super admin',
  admin: 'Admin',
  ops: 'Ops',
  merchandiser: 'Merchandiser',
  marketer: 'Marketer',
  analyst: 'Analyst (read-only)',
};

function fmt(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return String(ts);
  }
}

const emptyForm = { email: '', password: '', name: '', role: 'ops' };

export default function SettingsUsers() {
  const { user: me, hasRole } = useRole();
  const canManage = hasRole(['super_admin']);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ q: '', role: '', limit: 25, offset: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'ops', password: '' });
  const [saving, setSaving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const query = useMemo(() => {
    const q = { limit: String(filters.limit), offset: String(filters.offset) };
    if (filters.q.trim()) q.q = filters.q.trim();
    if (filters.role) q.role = filters.role;
    return q;
  }, [filters]);

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.adminUsers(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [canManage, query]);

  /* eslint-disable react-hooks/set-state-in-effect -- load on mount/query */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function createUser(e) {
    e.preventDefault();
    if (!canManage) return;
    setErr('');
    setCreating(true);
    try {
      await apiFetch(ADMIN.adminUsers(), {
        method: 'POST',
        auth: true,
        body: {
          email: createForm.email.trim(),
          password: createForm.password,
          name: createForm.name.trim() || undefined,
          role: createForm.role,
        },
      });
      setShowCreate(false);
      setCreateForm(emptyForm);
      await load();
    } catch (e2) {
      setErr(e2.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  function openEdit(row) {
    setEditTarget(row);
    setEditForm({ name: row.name || '', role: row.role, password: '' });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editTarget) return;
    setErr('');
    setSaving(true);
    try {
      const body = { name: editForm.name.trim() || undefined, role: editForm.role };
      if (editForm.password.trim()) body.password = editForm.password;
      await apiFetch(ADMIN.adminUser(editTarget.id), { method: 'PATCH', auth: true, body });
      setEditTarget(null);
      await load();
    } catch (e2) {
      setErr(e2.message || 'Update failed');
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
      await apiFetch(ADMIN.adminUser(target.id), { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setErr(e.message || 'Revoke failed');
    }
  }

  if (!canManage) {
    return (
      <div>
        <h1 className="admin-page-title">Users</h1>
        <p className="admin-err">Super admin access required.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Admin users</h1>
          <p className="admin-page-sub">Invite staff, assign roles, revoke admin access. Changes are audit-logged.</p>
        </div>
        <button type="button" className="btn sm" onClick={() => setShowCreate(true)}>
          Add user
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="staff-q">Search</label>
            <input
              id="staff-q"
              className="input"
              placeholder="Email or name"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="staff-role">Role</label>
            <select
              id="staff-role"
              className="input"
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value, offset: 0 }))}
            >
              <option value="">All roles</option>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {err ? <p className="admin-err">{err}</p> : null}
      {!loading ? (
        <TableCount shown={items.length} total={total} offset={filters.offset} label="staff users" />
      ) : (
        <p className="admin-muted">Loading…</p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Since</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr><td colSpan={5} className="admin-muted">No staff users found.</td></tr>
            ) : null}
            {items.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.email}</td>
                <td>{row.name || '—'}</td>
                <td className="mono">{ROLE_LABELS[row.role] ?? row.role}</td>
                <td>{fmt(row.createdAt)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn ghost sm" onClick={() => openEdit(row)}>Edit</button>
                  {row.id !== me?.id ? (
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ marginLeft: 8, color: '#b4542e' }}
                      onClick={() => setRevokeTarget(row)}
                    >
                      Revoke
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls
        total={total}
        limit={filters.limit}
        offset={filters.offset}
        onPage={(offset) => setFilters((f) => ({ ...f, offset }))}
        onLimit={(limit) => setFilters((f) => ({ ...f, limit, offset: 0 }))}
      />

      {showCreate ? (
        <div className="admin-dialog-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <div className="admin-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <h2 className="admin-page-title" style={{ fontSize: 18 }}>Add staff user</h2>
            <form onSubmit={createUser} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              <div>
                <label className="field-label" htmlFor="cu-email">Email</label>
                <input id="cu-email" className="input" type="email" required value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="field-label" htmlFor="cu-name">Name</label>
                <input id="cu-name" className="input" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="field-label" htmlFor="cu-role">Role</label>
                <select id="cu-role" className="input" value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}>
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="cu-pass">Password</label>
                <input id="cu-pass" className="input" type="password" required minLength={8} value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="admin-dialog-actions">
                <button type="button" className="btn ghost sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn sm" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="admin-dialog-backdrop" role="presentation" onMouseDown={() => setEditTarget(null)}>
          <div className="admin-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <h2 className="admin-page-title" style={{ fontSize: 18 }}>Edit {editTarget.email}</h2>
            <form onSubmit={saveEdit} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              <div>
                <label className="field-label" htmlFor="eu-name">Name</label>
                <input id="eu-name" className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="field-label" htmlFor="eu-role">Role</label>
                <select id="eu-role" className="input" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="eu-pass">New password (optional)</label>
                <input id="eu-pass" className="input" type="password" minLength={8} value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="admin-dialog-actions">
                <button type="button" className="btn ghost sm" onClick={() => setEditTarget(null)}>Cancel</button>
                <button type="submit" className="btn sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke admin access?"
        confirmLabel="Revoke"
        onConfirm={() => void confirmRevoke()}
        onCancel={() => setRevokeTarget(null)}
      >
        {revokeTarget ? (
          <p style={{ margin: 0 }}>
            {revokeTarget.email} will be demoted to a storefront customer (role user) and signed out.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
