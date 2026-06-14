import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { MARKETER_ROLES } from '../../auth/navConfig.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { IconButton } from '../../components/IconButton.jsx';
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

function StarText({ rating }) {
  return (
    <span className="mono" title={`${rating} / 5`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(Math.max(0, 5 - rating))}
    </span>
  );
}

export default function ReviewsQueue() {
  const { hasRole } = useRole();
  const canModerate = hasRole(MARKETER_ROLES);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState('');
  const [confirm, setConfirm] = useState(null); // { id, action: 'approve' | 'reject', productName }

  const query = useMemo(() => ({ limit: String(limit), offset: String(offset) }), [limit, offset]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(ADMIN.reviewsPending(query), { auth: true });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load reviews');
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

  async function runModeration(id, action) {
    if (!canModerate) return;
    setErr('');
    setInfo('');
    const path = action === 'approve' ? ADMIN.reviewApprove(id) : ADMIN.reviewReject(id);
    await apiFetch(path, { method: 'POST', auth: true });
    setInfo(action === 'approve' ? 'Review approved and published on storefront.' : 'Review rejected.');
    setConfirm(null);
    setExpandedId('');
    await fetchList();
  }

  return (
    <div>
      <h1 className="admin-page-title">Reviews</h1>
      <p className="admin-page-sub">Moderation queue — approve to publish on the product page.</p>

      <InfoPanel title="Workflow">
        <p style={{ margin: 0 }}>
          Approved reviews appear on the storefront PDP. Rejected reviews stay hidden. Verified purchase badge is set automatically when the customer has a delivered order for that product.
        </p>
      </InfoPanel>

      {err ? <p className="admin-err">{err}</p> : null}
      {info ? <p className="admin-muted" style={{ marginTop: 12 }}>{info}</p> : null}
      {loading ? <p className="admin-muted">Loading…</p> : null}

      {!loading ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><SortButton label="Product" column="productName" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Customer" column="userEmail" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Rating" column="rating" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Title" column="title" sort={sort} onSort={setSort} /></th>
                <th><SortButton label="Submitted" column="createdAt" sort={sort} onSort={setSort} /></th>
                <th>Verified</th>
                {canModerate ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={canModerate ? 7 : 6} className="admin-muted">
                    No pending reviews — queue is clear.
                  </td>
                </tr>
              ) : (
                visibleItems.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.productName || '—'}</div>
                        <div className="mono admin-muted" style={{ fontSize: 11 }}>{r.productSlug || r.productId}</div>
                      </td>
                      <td>
                        <div>{r.userName || '—'}</div>
                        <div className="mono admin-muted" style={{ fontSize: 11 }}>{r.userEmail || '—'}</div>
                      </td>
                      <td><StarText rating={r.rating} /></td>
                      <td>{r.title || '—'}</td>
                      <td className="mono">{fmt(r.createdAt)}</td>
                      <td>{r.isVerified ? 'Yes' : 'No'}</td>
                      {canModerate ? (
                        <td>
                          <div className="admin-row-actions" style={{ justifyContent: 'flex-end' }}>
                            <IconButton
                              icon="edit"
                              label="View review body"
                              onClick={() => setExpandedId((id) => (id === r.id ? '' : r.id))}
                            />
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => setConfirm({ id: r.id, action: 'approve', productName: r.productName })}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => setConfirm({ id: r.id, action: 'reject', productName: r.productName })}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                    {expandedId === r.id ? (
                      <tr key={`${r.id}-body`}>
                        <td colSpan={canModerate ? 7 : 6} style={{ background: 'var(--bg-elev)', padding: '16px 20px' }}>
                          <div className="mono admin-muted" style={{ fontSize: 11, marginBottom: 8 }}>Review body</div>
                          <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.body}</p>
                          {r.productSlug ? (
                            <p className="admin-muted" style={{ marginTop: 12, fontSize: 12 }}>
                              Storefront slug: <span className="mono">{r.productSlug}</span>
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
          <TableCount shown={visibleItems.length} total={total} label="pending reviews" />
          <PaginationControls
            limit={limit}
            offset={offset}
            total={total}
            onPage={setOffset}
            onLimit={(nextLimit) => {
              setLimit(nextLimit);
              setOffset(0);
            }}
          />
        </div>
      ) : null}

      {!canModerate ? (
        <p className="admin-muted" style={{ marginTop: 16 }}>
          Read-only — marketer role required to approve or reject.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.action === 'approve' ? 'Approve review?' : 'Reject review?'}
        confirmLabel={confirm?.action === 'approve' ? 'Approve' : 'Reject'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          void runModeration(confirm.id, confirm.action).catch((e) => setErr(e.message || 'Action failed'));
        }}
      >
        <p>
          {confirm?.action === 'approve'
            ? `Publish this review for “${confirm?.productName || 'product'}” on the storefront?`
            : `Reject this review for “${confirm?.productName || 'product'}”? It will not appear on the storefront.`}
        </p>
      </ConfirmDialog>
    </div>
  );
}
