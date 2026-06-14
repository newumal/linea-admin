import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { PaginationControls, SortButton, TableCount } from '../../components/TableTools.jsx';
import { sortRows } from '../../components/tableUtils.js';

function fmt(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(ts);
  }
}

export default function CustomersList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState({ key: 'lastOrderAt', dir: 'desc' });
  const [filters, setFilters] = useState({
    q: '',
    tier: '',
    limit: 25,
    offset: 0,
  });

  const query = useMemo(() => {
    const q = {};
    if (filters.q.trim()) q.q = filters.q.trim();
    if (filters.tier) q.tier = filters.tier;
    q.limit = String(filters.limit);
    q.offset = String(filters.offset);
    return q;
  }, [filters]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.customers(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount/query sync */
  useEffect(() => {
    void fetchList();
  }, [fetchList]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visibleItems = useMemo(() => sortRows(items, sort), [items, sort]);

  return (
    <div>
      <h1 className="admin-page-title">Customers</h1>
      <p className="admin-page-sub">Registered shoppers — order history, tier, and support impersonation.</p>

      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="cust-q">Search</label>
            <input
              id="cust-q"
              className="input"
              placeholder="Email, name, or phone"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="cust-tier">Tier</label>
            <select
              id="cust-tier"
              className="input"
              value={filters.tier}
              onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value, offset: 0 }))}
            >
              <option value="">Any</option>
              <option value="standard">Standard</option>
              <option value="vip">VIP</option>
              <option value="wholesale">Wholesale</option>
            </select>
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
                <th><SortButton label="Email" column="email" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Name" column="name" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Tier" column="tier" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Orders" column="orderCount" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Last order" column="lastOrderAt" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Member since" column="memberSince" sort={sort} onSort={setSort} /></th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-muted">
                    No customers match.
                  </td>
                </tr>
              ) : (
                visibleItems.map((c) => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <td className="mono">{c.email}</td>
                    <td>{c.name || '—'}</td>
                    <td className="mono">{c.tier}</td>
                    <td>{c.orderCount ?? 0}</td>
                    <td className="mono">{fmt(c.lastOrderAt)}</td>
                    <td className="mono">{fmt(c.memberSince || c.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <TableCount shown={visibleItems.length} total={total} label="customers" />
          <PaginationControls
            limit={filters.limit}
            offset={filters.offset}
            total={total}
            onPage={(nextOffset) => setFilters((f) => ({ ...f, offset: nextOffset }))}
            onLimit={(nextLimit) => setFilters((f) => ({ ...f, limit: nextLimit, offset: 0 }))}
          />
        </div>
      ) : null}

      <p className="admin-muted" style={{ marginTop: 16, fontSize: 12 }}>
        Tier changes require admin. Impersonation is super_admin only — open a customer for details.
      </p>
    </div>
  );
}
