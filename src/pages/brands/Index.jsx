import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { MERCHANDISER_ROLES } from '../../auth/navConfig.js';
import { IconButton } from '../../components/IconButton.jsx';
import { InfoPanel, SortButton, TableCount } from '../../components/TableTools.jsx';
import { slugify, sortRows } from '../../components/tableUtils.js';

export default function BrandsPage() {
  const { hasRole } = useRole();
  const canWrite = hasRole(MERCHANDISER_ROLES);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ slug: '', name: '', tag: '' });
  const [filters, setFilters] = useState({ q: '', house: '' });
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({ slug: '', name: '', tag: '', isHouse: false });

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.brands(), { auth: true });
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

  async function createBrand(e) {
    e.preventDefault();
    if (!canWrite) return;
    setErr('');
    await apiFetch(ADMIN.brands(), {
      method: 'POST',
      body: { slug: slugify(form.slug), name: form.name.trim(), tag: form.tag.trim() || null },
      auth: true,
    });
    setForm({ slug: '', name: '', tag: '' });
    await load();
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      slug: row.slug,
      name: row.name,
      tag: row.tag ?? '',
      isHouse: Boolean(row.isHouse),
    });
  }

  async function saveEdit(id) {
    setErr('');
    await apiFetch(ADMIN.brand(id), {
      method: 'PATCH',
      body: {
        slug: slugify(editForm.slug),
        name: editForm.name.trim(),
        tag: editForm.tag.trim() || null,
        isHouse: editForm.isHouse,
      },
      auth: true,
    });
    setEditingId('');
    await load();
  }

  async function archiveBrand(row) {
    if (!window.confirm(`Archive ${row.name}? This is only allowed when no products reference it.`)) return;
    setErr('');
    await apiFetch(ADMIN.brand(row.id), { method: 'DELETE', auth: true });
    await load();
  }

  const visibleItems = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const filtered = items.filter((b) => {
      const matchesQ = !q || [b.name, b.slug, b.tag].some((v) => String(v ?? '').toLowerCase().includes(q));
      const matchesHouse =
        !filters.house ||
        (filters.house === 'house' && b.isHouse) ||
        (filters.house === 'external' && !b.isHouse);
      return matchesQ && matchesHouse;
    });
    return sortRows(filtered, sort);
  }, [filters, items, sort]);

  return (
    <div>
      <h1 className="admin-page-title">Brands</h1>
      <p className="admin-page-sub">Brand records referenced by products.</p>
      <InfoPanel title="Brand fields">
        <p>
          <span className="mono">Slug</span> is the stable URL/API key, lowercase with hyphens. <span className="mono">Tag</span> is a short merchandising label shown internally, like "Italian linen" or "House label".
        </p>
      </InfoPanel>
      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="b-q">Search</label>
            <input
              id="b-q"
              className="input"
              placeholder="Name, slug, tag"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="b-house">Type</label>
            <select id="b-house" className="input" value={filters.house} onChange={(e) => setFilters((f) => ({ ...f, house: e.target.value }))}>
              <option value="">All</option>
              <option value="house">House</option>
              <option value="external">External</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn ghost sm" onClick={() => setFilters({ q: '', house: '' })}>
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
                <th><SortButton label="Tag" column="tag" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="House" column="isHouse" sort={sort} onSort={setSort} /></th>
                {canWrite ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((b) => (
                <tr key={b.id}>
                  {editingId === b.id ? (
                    <>
                      <td>
                        <input className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                      </td>
                      <td>
                        <input className="input mono" value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} />
                      </td>
                      <td>
                        <input className="input" value={editForm.tag} onChange={(e) => setEditForm((f) => ({ ...f, tag: e.target.value }))} />
                      </td>
                      <td>
                        <input type="checkbox" checked={editForm.isHouse} onChange={(e) => setEditForm((f) => ({ ...f, isHouse: e.target.checked }))} />
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <IconButton icon="save" label="Save brand" onClick={() => void saveEdit(b.id).catch((e) => setErr(e.message || 'Failed'))} />
                          <IconButton icon="cancel" label="Cancel edit" onClick={() => setEditingId('')} />
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{b.name}</td>
                      <td className="mono">{b.slug}</td>
                      <td>{b.tag || '—'}</td>
                      <td>{b.isHouse ? 'Yes' : 'No'}</td>
                      {canWrite ? (
                        <td>
                          <div className="admin-row-actions">
                            <IconButton icon="edit" label="Edit brand" onClick={() => startEdit(b)} />
                            <IconButton icon="archive" label="Archive brand" onClick={() => void archiveBrand(b).catch((e) => setErr(e.message || 'Archive failed'))} />
                          </div>
                        </td>
                      ) : null}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleItems.length === 0 ? <p className="admin-muted" style={{ padding: 16 }}>No brands match.</p> : null}
          <TableCount shown={visibleItems.length} total={items.length} label="brands" />
        </div>
      ) : null}

      {canWrite ? (
        <form onSubmit={createBrand} style={{ marginTop: 24, maxWidth: 480 }}>
          <h3 className="caps" style={{ marginBottom: 12 }}>New brand</h3>
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
              <label className="field-label">Tag</label>
              <input className="input" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} />
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
