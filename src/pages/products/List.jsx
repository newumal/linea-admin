import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { PaginationControls, SortButton, TableCount } from '../../components/TableTools.jsx';
import { sortRows } from '../../components/tableUtils.js';

export default function ProductsList() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState({ key: 'updatedAt', dir: 'desc' });
  const [filters, setFilters] = useState({
    q: '',
    categoryId: '',
    brandId: '',
    isActive: '',
    stockStatus: '',
    limit: 25,
    offset: 0,
  });

  const query = useMemo(() => {
    const q = {};
    if (filters.q.trim()) q.q = filters.q.trim();
    if (filters.categoryId) q.categoryId = filters.categoryId;
    if (filters.brandId) q.brandId = filters.brandId;
    if (filters.stockStatus) q.stockStatus = filters.stockStatus;
    if (filters.isActive === 'true' || filters.isActive === 'false') q.isActive = filters.isActive;
    q.limit = String(filters.limit);
    q.offset = String(filters.offset);
    return q;
  }, [filters]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.products(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadLookups = useCallback(async () => {
    const [cats, brs] = await Promise.all([
      apiFetch(ADMIN.categories(), { auth: true }),
      apiFetch(ADMIN.brands(), { auth: true }),
    ]);
    setCategories(cats.items ?? []);
    setBrands(brs.items ?? []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- mount/query sync via async fetch */
  useEffect(() => {
    void fetchList();
  }, [fetchList]);
  useEffect(() => {
    void loadLookups().catch((e) => setErr(e.message || 'Failed to load filters'));
  }, [loadLookups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visibleItems = useMemo(() => sortRows(items, sort), [items, sort]);
  const stats = useMemo(() => ({
    out: items.filter((p) => Number(p.totalStock ?? 0) === 0).length,
    low: items.filter((p) => Number(p.totalStock ?? 0) > 0 && Number(p.lowStockVariants ?? 0) > 0).length,
    variants: items.reduce((sum, p) => sum + Number(p.variantCount ?? 0), 0),
  }), [items]);

  function stockLabel(p) {
    if (Number(p.totalStock ?? 0) === 0) return 'Out';
    if (Number(p.lowStockVariants ?? 0) > 0) return 'Low';
    return 'OK';
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Products</h1>
          <p className="admin-page-sub">Catalog management — URL-based images, no uploads in MVP.</p>
        </div>
        <Link className="btn sm" to="/products/new">
          New product
        </Link>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="p-q">Search</label>
            <input
              id="p-q"
              className="input"
              placeholder="Name, slug, legacy code"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="p-brand">Brand</label>
            <select id="p-brand" className="input" value={filters.brandId} onChange={(e) => setFilters((f) => ({ ...f, brandId: e.target.value, offset: 0 }))}>
              <option value="">Any</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="p-category">Category</label>
            <select id="p-category" className="input" value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, offset: 0 }))}>
              <option value="">Any</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="p-active">Active</label>
            <select
              id="p-active"
              className="input"
              value={filters.isActive}
              onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value, offset: 0 }))}
            >
              <option value="">Any</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="p-stock">Stock</label>
            <select
              id="p-stock"
              className={`input ${filters.stockStatus ? 'filter-active' : ''}`}
              value={filters.stockStatus}
              onChange={(e) => setFilters((f) => ({ ...f, stockStatus: e.target.value, offset: 0 }))}
            >
              <option value="">Any</option>
              <option value="out">Out of stock</option>
              <option value="low">Low stock</option>
              <option value="in_stock">Healthy</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn sm" onClick={() => fetchList()}>
              Refresh
            </button>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setFilters((f) => ({ ...f, q: '', categoryId: '', brandId: '', isActive: '', stockStatus: '', offset: 0 }))}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {err ? <p className="admin-err">{err}</p> : null}
      {!loading ? (
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="caps">Out of stock</span>
            <strong>{stats.out}</strong>
          </div>
          <div className="admin-stat-card">
            <span className="caps">Low stock</span>
            <strong>{stats.low}</strong>
          </div>
          <div className="admin-stat-card">
            <span className="caps">Variants loaded</span>
            <strong>{stats.variants}</strong>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="admin-muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><SortButton label="Name" column="name" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Slug" column="slug" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Brand" column="brandName" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Category" column="categoryName" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Price" column="basePrice" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Stock" column="totalStock" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Active" column="isActive" sort={sort} onSort={setSort} /></th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/products/${p.id}`} style={{ fontWeight: 600 }}>
                      {p.name}
                    </Link>
                  </td>
                  <td className="mono" style={{ fontSize: 13 }}>
                    {p.slug}
                  </td>
                  <td>{p.brandName}</td>
                  <td>{p.categoryName}</td>
                  <td>
                    {p.basePrice != null ? `$${Number(p.basePrice).toFixed(2)}` : '—'}
                  </td>
                  <td>
                    <Link to={`/products/${p.id}`} className={`chip ${Number(p.totalStock ?? 0) === 0 || Number(p.lowStockVariants ?? 0) > 0 ? 'active' : ''}`}>
                      {stockLabel(p)} · {p.totalStock ?? 0} / {p.variantCount ?? 0}
                    </Link>
                  </td>
                  <td>{p.isActive ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleItems.length === 0 ? <p className="admin-muted" style={{ padding: 16 }}>No products match.</p> : null}
          <TableCount shown={visibleItems.length} total={total} offset={filters.offset} label="products" />
        </div>
      )}
      <PaginationControls
        limit={filters.limit}
        offset={filters.offset}
        total={total}
        onPage={(offset) => setFilters((f) => ({ ...f, offset }))}
        onLimit={(limit) => setFilters((f) => ({ ...f, limit, offset: 0 }))}
      />
    </div>
  );
}
