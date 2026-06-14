import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { MARKETER_ROLES } from '../../auth/navConfig.js';
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

function promoValueLabel(p) {
  if (p.type === 'free_shipping') return 'Free shipping';
  if (p.type === 'percent') return `${p.value}%`;
  return `$${Number(p.value).toFixed(2)}`;
}

function targetingSummary(p) {
  const bits = [];
  if (p.categoryIds?.length) bits.push(`${p.categoryIds.length} cat`);
  if (p.brandIds?.length) bits.push(`${p.brandIds.length} brand`);
  if (p.minItemPrice != null || p.maxItemPrice != null) {
    const lo = p.minItemPrice != null ? `$${p.minItemPrice}` : 'any';
    const hi = p.maxItemPrice != null ? `$${p.maxItemPrice}` : 'any';
    bits.push(`${lo}–${hi}`);
  }
  if (p.firstOrderOnly) bits.push('1st order');
  if (p.maxDiscountAmount != null) bits.push(`cap $${p.maxDiscountAmount}`);
  return bits.length ? bits.join(' · ') : 'All items';
}

function statusLabel(status) {
  const base = { className: 'mono', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };
  if (status === 'active') return <span style={{ ...base, color: 'var(--accent, #2d6a4f)' }}>{status}</span>;
  if (status === 'exhausted') return <span style={{ ...base, color: '#b4542e' }}>{status}</span>;
  if (status === 'expired' || status === 'disabled') return <span style={{ ...base, color: 'var(--mute)' }}>{status}</span>;
  return <span style={base}>{status}</span>;
}

export default function PromosList() {
  const navigate = useNavigate();
  const { hasRole } = useRole();
  const canWrite = hasRole(MARKETER_ROLES);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    isActive: '',
    limit: 25,
    offset: 0,
  });

  const query = useMemo(() => {
    const q = {};
    if (filters.q.trim()) q.q = filters.q.trim();
    if (filters.status) q.status = filters.status;
    if (filters.isActive === 'true' || filters.isActive === 'false') q.isActive = filters.isActive;
    q.limit = String(filters.limit);
    q.offset = String(filters.offset);
    return q;
  }, [filters]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.promos(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load promos');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Promos</h1>
          <p className="admin-page-sub">Discount codes — usage limits, schedules, and redemption reporting.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn ghost sm" to="/promos/redemptions">
            Redemptions
          </Link>
          {canWrite ? (
            <Link className="btn sm" to="/promos/new">
              New promo
            </Link>
          ) : null}
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filters-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="promo-q">Search</label>
            <input
              id="promo-q"
              className="input"
              placeholder="Code"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, offset: 0 }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="promo-status">Status</label>
            <select
              id="promo-status"
              className="input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, offset: 0 }))}
            >
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="exhausted">Exhausted</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="promo-active">Enabled</label>
            <select
              id="promo-active"
              className="input"
              value={filters.isActive}
              onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value, offset: 0 }))}
            >
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
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
                <th><SortButton label="Code" column="code" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Type" column="type" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Value" column="value" sort={sort} onSort={setSort} /></th>
                <th>Targeting</th>
                <th><SortButton label="Uses" column="usedCount" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Status" column="status" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Starts" column="startsAt" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Ends" column="endsAt" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Active" column="isActive" sort={sort} onSort={setSort} /></th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="admin-muted">
                    No promos match.
                  </td>
                </tr>
              ) : (
                visibleItems.map((p) => (
                  <tr
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/promos/${p.id}`)}
                  >
                    <td>
                      <span className="mono" style={{ fontWeight: 600 }}>{p.code}</span>
                    </td>
                    <td className="mono">{p.type}</td>
                    <td>{promoValueLabel(p)}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{targetingSummary(p)}</td>
                    <td>
                      {p.usedCount ?? 0}
                      {p.maxUses != null ? ` / ${p.maxUses}` : ''}
                    </td>
                    <td>{statusLabel(p.status)}</td>
                    <td className="mono">{fmt(p.startsAt)}</td>
                    <td className="mono">{fmt(p.endsAt)}</td>
                    <td>{p.isActive ? 'Yes' : 'No'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <TableCount shown={visibleItems.length} total={total} label="promos" />
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
