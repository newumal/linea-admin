import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { RESTOCK_ROLES } from '../../auth/navConfig.js';
import { InfoPanel, PaginationControls, SortButton, TableCount } from '../../components/TableTools.jsx';
import { sortRows } from '../../components/tableUtils.js';

function fmt(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(ts);
  }
}

function shortUuid(u) {
  if (!u) return '—';
  const s = String(u);
  return s.length > 8 ? `${s.slice(0, 8)}…` : s;
}

export default function RestockRequestsPage() {
  const { hasRole } = useRole();
  const canAccess = hasRole(RESTOCK_ROLES);
  const requestLogRef = useRef(null);

  const [summary, setSummary] = useState([]);
  const [detail, setDetail] = useState([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [filterProductId, setFilterProductId] = useState('');
  const [productContext, setProductContext] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!canAccess) return;
    const d = await apiFetch(ADMIN.restockSummary(), { auth: true });
    setSummary(d.items ?? []);
  }, [canAccess]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount & filters */
  useEffect(() => {
    if (!canAccess) return;
    void loadSummary().catch((e) => setErr(e.message || 'Failed to load summary'));
  }, [canAccess, loadSummary]);

  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    const q = { limit: String(limit), offset: String(offset) };
    if (statusFilter !== 'all') q.status = statusFilter;
    if (filterProductId.trim()) q.productId = filterProductId.trim();
    void apiFetch(ADMIN.restockRequests(q), { auth: true })
      .then((d) => {
        if (cancelled) return;
        setDetail(d.items ?? []);
        setDetailTotal(d.total ?? 0);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || 'Failed to load requests');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAccess, filterProductId, limit, offset, statusFilter]);

  useEffect(() => {
    setOffset(0);
  }, [filterProductId, statusFilter, limit]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sortedDetail = useMemo(() => sortRows(detail, sort), [detail, sort]);

  function scrollToRequestLog() {
    requestLogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function viewRequestsForProduct(row) {
    setFilterProductId(row.productId);
    setProductContext({ id: row.productId, name: row.name });
    setStatusFilter('all');
    setInfo(`Showing full history for “${row.name}”. Use Status to narrow to pending only.`);
    window.requestAnimationFrame(() => {
      scrollToRequestLog();
    });
  }

  function clearProductFilter() {
    setFilterProductId('');
    setProductContext(null);
    setInfo('');
  }

  async function patchStatus(id, status) {
    setErr('');
    setInfo('');
    await apiFetch(ADMIN.restockRequest(id), { method: 'PATCH', body: { status }, auth: true });
    if (status === 'notified') {
      setInfo('Marked notified — row stays in this list while Status is “All” or “Notified”.');
    }
    await loadSummary();
    const q = { limit: String(limit), offset: String(offset) };
    if (statusFilter !== 'all') q.status = statusFilter;
    if (filterProductId.trim()) q.productId = filterProductId.trim();
    const d = await apiFetch(ADMIN.restockRequests(q), { auth: true });
    setDetail(d.items ?? []);
    setDetailTotal(d.total ?? 0);
  }

  if (!canAccess) {
    return <p className="admin-muted">You don’t have access to restock alerts.</p>;
  }

  return (
    <div>
      <h1 className="admin-page-title">Restock alerts</h1>
      <p className="admin-page-sub">
        Customers who asked to be emailed when a sold-out size/colour is available again. Use counts and dates to prioritise purchasing and production.
      </p>

      <InfoPanel title="Workflow">
        <p style={{ margin: 0 }}>
          The request log defaults to <strong>all statuses</strong> so nothing disappears after you mark someone notified. Narrow to <strong>Pending</strong> when you want the active queue only. After you email customers, use{' '}
          <strong>Mark notified</strong> — reopen a row with <strong>Back to pending</strong> if you clicked by mistake.
        </p>
      </InfoPanel>

      {err ? <p className="admin-err">{err}</p> : null}
      {info ? <p className="admin-muted" style={{ marginTop: 12 }}>{info}</p> : null}
      {loading ? <p className="admin-muted">Loading…</p> : null}

      <h2 className="caps" style={{ marginTop: 28, marginBottom: 12 }}>
        Demand by product
      </h2>
      <TableCount shown={summary.length} total={summary.length} label="products with pending requests" />
      <div className="admin-table-wrap" style={{ marginBottom: 32 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Pending</th>
              <th>First request</th>
              <th>Last request</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-muted">
                  No pending restock requests.
                </td>
              </tr>
            ) : (
              summary.map((row) => (
                <tr key={row.productId}>
                  <td>
                    <Link to={`/products/${row.productId}`} style={{ fontWeight: 600 }}>
                      {row.name}
                    </Link>
                    <div className="mono admin-muted" style={{ fontSize: 11 }}>
                      {row.slug}
                    </div>
                    <div className="mono admin-muted" style={{ fontSize: 10, marginTop: 4 }}>
                      Product ID: {row.productId}
                    </div>
                  </td>
                  <td>{row.brandName}</td>
                  <td>
                    <strong>{row.pendingCount}</strong>
                  </td>
                  <td className="mono">{fmt(row.firstRequestedAt)}</td>
                  <td className="mono">{fmt(row.lastRequestedAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className="btn ghost sm" onClick={() => viewRequestsForProduct(row)}>
                      View requests
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 ref={requestLogRef} className="caps" style={{ marginBottom: 12, scrollMarginTop: 24 }}>
        Request log
      </h2>
      {productContext ? (
        <div
          className="admin-info-panel"
          style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}
        >
          <div>
            <span className="caps">Filtered product</span>
            <div style={{ marginTop: 6 }}>
              <strong>{productContext.name}</strong>
              <span className="mono admin-muted" style={{ marginLeft: 8, fontSize: 12 }}>
                {productContext.id}
              </span>
            </div>
          </div>
          <button type="button" className="btn ghost sm" onClick={clearProductFilter}>
            Clear product filter
          </button>
        </div>
      ) : null}
      <div className="admin-filters-grid" style={{ marginBottom: 16, maxWidth: 720 }}>
        <div>
          <label className="field-label" htmlFor="rs">
            Status
          </label>
          <select id="rs" className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All (history)</option>
            <option value="pending">Pending only</option>
            <option value="notified">Notified</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="rp">
            Product ID (manual)
          </label>
          <input
            id="rp"
            className="input mono"
            placeholder="UUID"
            value={filterProductId}
            onChange={(e) => {
              setFilterProductId(e.target.value);
              setProductContext(null);
            }}
          />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              clearProductFilter();
              setStatusFilter('all');
            }}
          >
            Clear all filters
          </button>
        </div>
      </div>

      <TableCount shown={sortedDetail.length} total={detailTotal} offset={offset} label="requests" />
      <PaginationControls limit={limit} offset={offset} total={detailTotal} onPage={setOffset} onLimit={setLimit} />

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <SortButton label="Created" column="createdAt" sort={sort} onSort={setSort} />
              </th>
              <th>Email</th>
              <th>Product</th>
              <th>Variant</th>
              <th>
                <SortButton label="Notified" column="notifiedAt" sort={sort} onSort={setSort} />
              </th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDetail.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-muted">
                  No rows for this filter.
                </td>
              </tr>
            ) : (
              sortedDetail.map((row) => (
                <tr key={row.id}>
                  <td className="mono">
                    {fmt(row.createdAt)}
                    <div className="admin-muted" style={{ fontSize: 10, marginTop: 4 }}>
                      Req {shortUuid(row.id)}
                    </div>
                  </td>
                  <td>{row.email}</td>
                  <td>
                    <Link to={`/products/${row.productId}`}>{row.productName}</Link>
                    <div className="mono admin-muted" style={{ fontSize: 10, marginTop: 4 }}>
                      {row.productSlug}
                    </div>
                  </td>
                  <td className="mono">
                    {row.sizeSnapshot || '—'} · {row.colorNameSnapshot || '—'}{' '}
                    <span className="admin-muted">{row.colorHexSnapshot || ''}</span>
                    <div className="admin-muted" style={{ fontSize: 10, marginTop: 4 }}>
                      Var {shortUuid(row.variantId)}
                    </div>
                  </td>
                  <td className="mono">{fmt(row.notifiedAt)}</td>
                  <td>{row.status}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {row.status === 'pending' ? (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => void patchStatus(row.id, 'notified').catch((e) => setErr(e.message || 'Failed'))}
                        >
                          Mark notified
                        </button>
                      ) : null}
                      {row.status !== 'pending' ? (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => void patchStatus(row.id, 'pending').catch((e) => setErr(e.message || 'Failed'))}
                        >
                          Back to pending
                        </button>
                      ) : null}
                      {row.status === 'pending' ? (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => void patchStatus(row.id, 'cancelled').catch((e) => setErr(e.message || 'Failed'))}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
