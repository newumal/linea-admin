import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { MERCHANDISER_ROLES } from '../../auth/navConfig.js';
import { IconButton } from '../../components/IconButton.jsx';
import { InfoPanel, SortButton, TableCount } from '../../components/TableTools.jsx';
import { slugify, sortRows } from '../../components/tableUtils.js';

export default function CategoriesPage() {
  const { hasRole } = useRole();
  const canWrite = hasRole(MERCHANDISER_ROLES);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ slug: '', name: '', sortOrder: '0' });
  const [filters, setFilters] = useState({ q: '', active: '' });
  const [sort, setSort] = useState({ key: 'sortOrder', dir: 'asc' });
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({ slug: '', name: '', sortOrder: '0', isActive: true });

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.categories(), { auth: true });
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

  async function createCat(e) {
    e.preventDefault();
    if (!canWrite) return;
    setErr('');
    await apiFetch(ADMIN.categories(), {
      method: 'POST',
      body: { slug: slugify(form.slug), name: form.name.trim(), sortOrder: parseInt(form.sortOrder, 10) || 0 },
      auth: true,
    });
    setForm({ slug: '', name: '', sortOrder: '0' });
    await load();
  }

  async function toggleActive(cat) {
    if (!canWrite) return;
    setErr('');
    await apiFetch(ADMIN.category(cat.id), { method: 'PATCH', body: { isActive: !cat.isActive }, auth: true });
    await load();
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      slug: row.slug,
      name: row.name,
      sortOrder: String(row.sortOrder ?? 0),
      isActive: Boolean(row.isActive),
    });
  }

  async function saveEdit(id) {
    setErr('');
    await apiFetch(ADMIN.category(id), {
      method: 'PATCH',
      body: {
        slug: slugify(editForm.slug),
        name: editForm.name.trim(),
        sortOrder: parseInt(editForm.sortOrder, 10) || 0,
        isActive: editForm.isActive,
      },
      auth: true,
    });
    setEditingId('');
    await load();
  }

  async function archiveCategory(row) {
    if (!window.confirm(`Archive ${row.name}? Categories with products are deactivated, empty categories are deleted.`)) return;
    setErr('');
    await apiFetch(ADMIN.category(row.id), { method: 'DELETE', auth: true });
    await load();
  }

  const visibleItems = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const filtered = items.filter((c) => {
      const matchesQ = !q || [c.name, c.slug].some((v) => String(v ?? '').toLowerCase().includes(q));
      const matchesActive =
        !filters.active ||
        (filters.active === 'active' && c.isActive) ||
        (filters.active === 'inactive' && !c.isActive);
      return matchesQ && matchesActive;
    });
    return sortRows(filtered, sort);
  }, [filters, items, sort]);

  return (
    <div>
      <h1 className="admin-page-title">Categories</h1>
      <p className="admin-page-sub">Flat list with sort order; parent hierarchy can be extended later.</p>
      <InfoPanel title="Category fields">
        <p>
          <span className="mono">Slug</span> is the storefront URL segment. <span className="mono">Sort</span> controls display order in category navigation; lower numbers appear first.
        </p>
      </InfoPanel>
      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="c-q">Search</label>
            <input id="c-q" className="input" placeholder="Name or slug" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </div>
          <div>
            <label className="field-label" htmlFor="c-active">Active</label>
            <select id="c-active" className="input" value={filters.active} onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value }))}>
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn ghost sm" onClick={() => setFilters({ q: '', active: '' })}>
              Clear
            </button>
          </div>
        </div>
      </div>
      {err ? <p className="admin-err">{err}</p> : null}
      {loading ? <p className="admin-muted">Loading…</p> : null}
      {!loading ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><SortButton label="Name" column="name" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Slug" column="slug" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Sort" column="sortOrder" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Products" column="productCount" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Active" column="isActive" sort={sort} onSort={setSort} /></th>
                {canWrite ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((c) => (
                <tr key={c.id}>
                  {editingId === c.id ? (
                    <>
                      <td><input className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></td>
                      <td><input className="input mono" value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} /></td>
                      <td><input className="input mono" type="number" value={editForm.sortOrder} onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))} /></td>
                      <td>{c.productCount ?? '—'}</td>
                      <td><input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} /></td>
                      <td>
                        <div className="admin-row-actions">
                          <IconButton icon="save" label="Save category" onClick={() => void saveEdit(c.id).catch((e) => setErr(e.message || 'Failed'))} />
                          <IconButton icon="cancel" label="Cancel edit" onClick={() => setEditingId('')} />
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{c.name}</td>
                      <td className="mono">{c.slug}</td>
                      <td>{c.sortOrder}</td>
                      <td>{c.productCount ?? '—'}</td>
                      <td>{c.isActive ? 'Yes' : 'No'}</td>
                      {canWrite ? (
                        <td>
                          <div className="admin-row-actions">
                            <IconButton icon="edit" label="Edit category" onClick={() => startEdit(c)} />
                            <IconButton
                              icon="activate"
                              label={c.isActive ? 'Deactivate category' : 'Activate category'}
                              onClick={() => void toggleActive(c).catch((e) => setErr(e.message || 'Failed'))}
                            />
                            <IconButton icon="archive" label="Archive category" onClick={() => void archiveCategory(c).catch((e) => setErr(e.message || 'Archive failed'))} />
                          </div>
                        </td>
                      ) : null}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleItems.length === 0 ? <p className="admin-muted" style={{ padding: 16 }}>No categories match.</p> : null}
          <TableCount shown={visibleItems.length} total={items.length} label="categories" />
        </div>
      ) : null}

      {canWrite ? (
        <form onSubmit={createCat} style={{ marginTop: 24, maxWidth: 480 }}>
          <h3 className="caps" style={{ marginBottom: 12 }}>New category</h3>
          <div className="admin-filters-grid">
            <div>
              <label className="field-label">Slug</label>
              <input className="input mono" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
            </div>
            <div>
              <label className="field-label">Name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Sort</label>
              <input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn sm" style={{ marginTop: 12 }}>
            Create
          </button>
        </form>
      ) : null}
    </div>
  );
}
