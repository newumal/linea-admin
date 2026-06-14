import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

function fromDateInputToIso(dateStr, endOfDay = false) {
  if (!dateStr) return undefined;
  const d = new Date(`${dateStr}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function PromoRedemptions() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [filters, setFilters] = useState({
    code: searchParams.get('code') ?? '',
    placedFrom: '',
    placedTo: '',
    limit: 25,
    offset: 0,
  });

  const query = useMemo(() => {
    const q = {};
    if (filters.code.trim()) q.code = filters.code.trim();
    const from = fromDateInputToIso(filters.placedFrom, false);
    const to = fromDateInputToIso(filters.placedTo, true);
    if (from) q.placedFrom = from;
    if (to) q.placedTo = to;
    q.limit = String(filters.limit);
    q.offset = String(filters.offset);
    return q;
  }, [filters]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.promoRedemptions(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load redemptions');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount/query sync */
  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    const code = filters.code.trim();
    if (code) setSearchParams({ code }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [filters.code, setSearchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visibleItems = useMemo(() => sortRows(items, sort), [items, sort]);

  return (
    <div>
      <Link to="/promos" className="mono admin-muted" style={{ fontSize: 12 }}>
        ← Promos
      </Link>
      <h1 className="admin-page-title" style={{ marginTop: 8 }}>
        Promo redemptions
      </h1>
      <p className="admin-page-sub">Every checkout where a discount code was applied.</p>

      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div>
            <label className="field-label" htmlFor="red-code">Code</label>
            <input
              id="red-code"
              className="input mono"
              placeholder="SUMMER20"
              value={filters.code}
              onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value.toUpperCase(), offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="red-from">Placed from</label>
            <input
              id="red-from"
              className="input"
              type="date"
              value={filters.placedFrom}
              onChange={(e) => setFilters((f) => ({ ...f, placedFrom: e.target.value, offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="red-to">Placed to</label>
            <input
              id="red-to"
              className="input"
              type="date"
              value={filters.placedTo}
              onChange={(e) => setFilters((f) => ({ ...f, placedTo: e.target.value, offset: 0 }))}
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setFilters((f) => ({ ...f, code: '', placedFrom: '', placedTo: '', offset: 0 }))}
            >
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
                <th><SortButton label="Code" column="discountCode" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Customer" column="customerEmail" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Order" column="orderCode" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Order total" column="orderTotal" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Discount" column="amount" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Redeemed" column="createdAt" sort={sort} onSort={setSort} /></th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-muted">
                    No redemptions match.
                  </td>
                </tr>
              ) : (
                visibleItems.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.discountCode}</td>
                    <td>
                      <div>{r.customerName || '—'}</div>
                      <div className="mono admin-muted" style={{ fontSize: 11 }}>{r.customerEmail || '—'}</div>
                    </td>
                    <td>
                      {r.orderCode ? (
                        <Link to={`/orders/${r.orderId}`} className="mono">
                          {r.orderCode}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{r.orderTotal != null ? `$${Number(r.orderTotal).toFixed(2)}` : '—'}</td>
                    <td>${Number(r.amount).toFixed(2)}</td>
                    <td className="mono">{fmt(r.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <TableCount shown={visibleItems.length} total={total} label="redemptions" />
          <PaginationControls
            limit={filters.limit}
            offset={filters.offset}
            total={total}
            onPage={(nextOffset) => setFilters((f) => ({ ...f, offset: nextOffset }))}
            onLimit={(nextLimit) => setFilters((f) => ({ ...f, limit: nextLimit, offset: 0 }))}
          />
        </div>
      ) : null}
    </div>
  );
}
