import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { MERCHANDISER_ROLES } from '../../auth/navConfig.js';
import { InfoPanel, SortButton, TableCount } from '../../components/TableTools.jsx';
import { sortRows } from '../../components/tableUtils.js';

const DEFAULT_THRESHOLD = 5;

export default function LowStock() {
  const { hasRole } = useRole();
  const canWrite = hasRole(MERCHANDISER_ROLES);

  const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_THRESHOLD));
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState({ key: 'stock', dir: 'asc' });

  const query = useMemo(() => ({ threshold: String(threshold) }), [threshold]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.inventoryLowStock(query), { auth: true });
      setItems(data.items ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load low stock');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount/query sync via async fetch */
  useEffect(() => {
    void fetchList();
  }, [fetchList]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function applyThreshold(e) {
    e.preventDefault();
    const n = parseInt(thresholdInput, 10);
    if (!Number.isFinite(n) || n < 0) {
      setErr('Threshold must be a non-negative integer');
      return;
    }
    setThreshold(n);
  }

  async function patchStock(variantId, stock) {
    setErr('');
    await apiFetch(ADMIN.inventoryVariantStock(variantId), { method: 'PATCH', body: { stock }, auth: true });
    await fetchList();
  }

  const visibleItems = useMemo(() => sortRows(items, sort), [items, sort]);

  return (
    <div>
      <h1 className="admin-page-title">Low stock</h1>
      <p className="admin-page-sub">Reorder queue for variants whose available stock is below your chosen threshold.</p>
      <InfoPanel title="How inventory works">
        <p>
          Add products and variants from <Link to="/products/new" style={{ textDecoration: 'underline' }}>Products</Link>. This page only shows variants below threshold, then lets merchandisers correct the on-hand stock after receiving or recounting inventory.
        </p>
      </InfoPanel>
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="caps">Threshold</span>
          <strong>{threshold}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="caps">Low variants</span>
          <strong>{items.length}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="caps">Can adjust</span>
          <strong>{canWrite ? 'Yes' : 'No'}</strong>
        </div>
      </div>

      <form className="admin-toolbar" onSubmit={applyThreshold} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="field-label" htmlFor="thr">Threshold</label>
          <input id="thr" className="input mono" style={{ width: 120 }} type="number" min={0} value={thresholdInput} onChange={(e) => setThresholdInput(e.target.value)} />
        </div>
        <button type="submit" className="btn sm">
          Apply
        </button>
        <button type="button" className="btn ghost sm" onClick={() => void fetchList()}>
          Refresh
        </button>
        <Link className="btn ghost sm" to="/products/new">
          Add product
        </Link>
      </form>

      {err ? <p className="admin-err">{err}</p> : null}

      {loading ? (
        <p className="admin-muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><SortButton label="SKU" column="sku" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Product" column="productName" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Stock" column="stock" sort={sort} onSort={setSort} /></th>
                {canWrite ? <th>Adjust</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((row) => (
                <tr key={row.variantId}>
                  <td className="mono">{row.sku}</td>
                  <td>
                    <Link to={`/products/${row.productId}`}>{row.productName}</Link>
                    <span className="admin-muted mono" style={{ marginLeft: 8, fontSize: 12 }}>
                      {row.productSlug}
                    </span>
                  </td>
                  <td>{row.stock}</td>
                  {canWrite ? (
                    <td>
                      <input
                        className="input sm mono"
                        style={{ width: 88 }}
                        type="number"
                        min={0}
                        defaultValue={row.stock}
                        key={row.variantId + String(row.stock)}
                        onBlur={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (Number.isFinite(n) && n !== row.stock) void patchStock(row.variantId, n).catch((er) => setErr(er.message || 'Update failed'));
                        }}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleItems.length === 0 ? <p className="admin-muted" style={{ padding: 16 }}>No variants below threshold {threshold}.</p> : null}
          <TableCount shown={visibleItems.length} total={items.length} label="low-stock variants" />
        </div>
      )}
    </div>
  );
}
