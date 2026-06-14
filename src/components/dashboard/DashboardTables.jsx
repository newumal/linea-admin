import { Link } from 'react-router-dom';
import { fmtDay, moneyPrecise, pct } from '../../lib/dashboardFormat.js';
import { ChartPanel } from './DashboardWidgets.jsx';

export function SalesDailyTable({ series }) {
  const rows = [...(series ?? [])].reverse().slice(0, 14);
  return (
    <ChartPanel title="Sales by day" empty={rows.length ? null : 'No orders in range.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.day)}>
                <td className="mono">{fmtDay(r.day)}</td>
                <td>{r.orders}</td>
                <td className="mono">{moneyPrecise(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function FunnelBreakdownTable({ stages }) {
  const rows = stages ?? [];
  return (
    <ChartPanel title="Funnel breakdown" empty={rows.length ? null : 'No funnel data yet.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Count</th>
              <th>% of sessions</th>
              <th>Drop-off</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const prev = i > 0 ? rows[i - 1].count : null;
              const drop =
                prev != null && prev > 0 ? pct(((prev - row.count) / prev) * 100, 1) : '—';
              return (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="mono">{row.count}</td>
                  <td className="mono">{pct(row.rate, 1)}</td>
                  <td className="mono" style={{ color: i === 0 ? 'var(--mute)' : undefined }}>{drop}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function TopProductsTable({ items }) {
  const rows = items ?? [];
  const totalRev = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
  return (
    <ChartPanel title="Top products (detail)" empty={rows.length ? null : 'No product sales.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Units</th>
              <th>Revenue</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.productId}>
                <td>{row.name}</td>
                <td className="mono">{row.units}</td>
                <td className="mono">{moneyPrecise(row.revenue)}</td>
                <td className="mono">
                  {totalRev > 0 ? pct((row.revenue / totalRev) * 100, 1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function PageActivityTable({ items }) {
  return (
    <ChartPanel title="Top pages (views)" empty={items?.length ? null : 'Browse the storefront to collect page views.'}>
      {items?.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Path</th>
              <th>Views</th>
              <th>Avg time</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.path}>
                <td className="mono">{row.path}</td>
                <td>{row.views}</td>
                <td>{row.avgDurationMs != null ? `${(row.avgDurationMs / 1000).toFixed(1)}s` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function OpsSignalsTable({ actions, hasRole, roles }) {
  if (!actions) return null;
  const rows = [];
  if (hasRole(roles.ORDER_OPS) && actions.ordersToFulfill > 0) {
    rows.push({ label: 'Orders to fulfill', count: actions.ordersToFulfill, to: '/orders?status=paid' });
  }
  if (hasRole(roles.MERCHANDISER) && actions.lowStockVariants > 0) {
    rows.push({ label: 'Low-stock variants', count: actions.lowStockVariants, to: '/inventory' });
  }
  if (hasRole(roles.RESTOCK) && actions.restockPending > 0) {
    rows.push({ label: 'Restock requests', count: actions.restockPending, to: '/restock-requests' });
  }
  if (hasRole(roles.MARKETER) && actions.pendingReviews > 0) {
    rows.push({ label: 'Reviews pending', count: actions.pendingReviews, to: '/reviews' });
  }

  return (
    <ChartPanel title="Ops signals" empty={rows.length ? null : 'All clear — no urgent ops items.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Count</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="mono">{row.count}</td>
                <td>
                  <Link to={row.to} className="mono" style={{ fontSize: 12 }}>
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function TopCustomersTable({ items }) {
  const rows = items ?? [];
  return (
    <ChartPanel title="Top customers" empty={rows.length ? null : 'No logged-in customer orders in this range.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Orders</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <td className="mono">{row.email}</td>
                <td>{row.orders}</td>
                <td className="mono">{moneyPrecise(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function PromoPerformanceTable({ promos }) {
  const rows = promos ?? [];
  return (
    <ChartPanel title="Promo performance" empty={rows.length ? null : 'No redemptions in this range.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Uses</th>
              <th>Discount</th>
              <th>Order revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code}>
                <td className="mono">{row.code}</td>
                <td className="mono">{row.type}</td>
                <td>{row.redemptions}</td>
                <td className="mono">{moneyPrecise(row.discountTotal)}</td>
                <td className="mono">{moneyPrecise(row.orderRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function CatalogBreakdownTable({ items, title }) {
  const rows = items ?? [];
  const totalRev = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
  return (
    <ChartPanel title={title} empty={rows.length ? null : 'No sales in this range.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Units</th>
              <th>Revenue</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="mono">{row.units}</td>
                <td className="mono">{moneyPrecise(row.revenue)}</td>
                <td className="mono">
                  {totalRev > 0 ? pct((row.revenue / totalRev) * 100, 1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function StatusCountTable({ items, title }) {
  const rows = items ?? [];
  return (
    <ChartPanel title={title} empty={rows.length ? null : 'No data in this range.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.status}>
                <td className="mono">{row.status}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function LowStockTable({ items }) {
  const rows = items ?? [];
  return (
    <ChartPanel title="Low stock (≤5 units)" empty={rows.length ? null : 'No low-stock variants.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Size</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.sku}-${row.size}`}>
                <td>{row.productName}</td>
                <td className="mono">{row.sku}</td>
                <td>{row.size || '—'}</td>
                <td className="mono">{row.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function ReferrersTable({ items }) {
  const rows = items ?? [];
  return (
    <ChartPanel title="Referrer detail" empty={rows.length ? null : 'No page views in this range.'}>
      {rows.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Source</th>
              <th>Page views</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.source}>
                <td className="mono">{row.source}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}
