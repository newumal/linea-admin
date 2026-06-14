import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import {
  CatalogRevenueChart,
  CustomerSplitChart,
  EventCountsChart,
  FunnelChart,
  OrdersByStatusChart,
  PreorderPipelineTable,
  PromoRedemptionsChart,
  ReferrersChart,
  SalesOverTimeChart,
  SlowPagesTable,
  TopProductsChart,
} from '../../components/dashboard/DashboardCharts.jsx';
import {
  CatalogBreakdownTable,
  FunnelBreakdownTable,
  LowStockTable,
  PageActivityTable,
  PromoPerformanceTable,
  ReferrersTable,
  SalesDailyTable,
  StatusCountTable,
  TopCustomersTable,
  TopProductsTable,
} from '../../components/dashboard/DashboardTables.jsx';
import { DashboardStatCard, RangeSelect } from '../../components/dashboard/DashboardWidgets.jsx';
import { money, moneyPrecise, pct } from '../../lib/dashboardFormat.js';

const TABS = [
  { id: 'sales', label: 'Sales' },
  { id: 'conversion', label: 'Conversion' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'operations', label: 'Operations' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'experience', label: 'Experience' },
];

async function fetchTabData(tab, range) {
  switch (tab) {
    case 'sales': {
      const [kpis, sales] = await Promise.all([
        apiFetch(ADMIN.dashboardKpis({ range, compare: 'true' }), { auth: true }),
        apiFetch(ADMIN.dashboardSalesOverTime({ range }), { auth: true }),
      ]);
      return { kpis, salesSeries: sales.series ?? [] };
    }
    case 'conversion': {
      const [kpis, fun, slow, pages] = await Promise.all([
        apiFetch(ADMIN.dashboardKpis({ range, compare: 'true' }), { auth: true }),
        apiFetch(ADMIN.dashboardFunnel({ range }), { auth: true }),
        apiFetch(ADMIN.dashboardSlowPages({ range, minViews: '50' }), { auth: true }),
        apiFetch(ADMIN.dashboardTopPages({ range, limit: '12' }), { auth: true }),
      ]);
      return {
        kpis,
        funnel: fun.stages ?? [],
        slowPages: slow.items ?? [],
        topPages: pages.items ?? [],
      };
    }
    case 'products': {
      const top = await apiFetch(ADMIN.dashboardTopProducts({ range, limit: '15' }), { auth: true });
      return { topProducts: top.items ?? [] };
    }
    case 'customers':
      return apiFetch(ADMIN.dashboardCustomers({ range, limit: '15' }), { auth: true });
    case 'marketing':
      return apiFetch(ADMIN.dashboardMarketing({ range }), { auth: true });
    case 'operations':
      return apiFetch(ADMIN.dashboardOperations({ range }), { auth: true });
    case 'catalog':
      return apiFetch(ADMIN.dashboardCatalog({ range, limit: '10' }), { auth: true });
    case 'experience':
      return apiFetch(ADMIN.dashboardExperience({ range, limit: '8' }), { auth: true });
    default:
      return null;
  }
}

export default function AnalyticsIndex() {
  const [tab, setTab] = useState('sales');
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const result = await fetchTabData(tab, range);
      setData(result);
    } catch (e) {
      setData(null);
      setErr(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [tab, range]);

  /* eslint-disable react-hooks/set-state-in-effect -- load on tab/range change */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const ch = data?.kpis?.change ?? {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-sub">
            Deep dive by domain — each tab loads only what it needs from live DB tables.
          </p>
        </div>
        <RangeSelect value={range} onChange={setRange} />
      </div>

      <div className="admin-toolbar" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'btn sm' : 'btn ghost sm'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {err ? <p className="admin-err">{err}</p> : null}
      {loading ? <p className="admin-muted" style={{ marginTop: 16 }}>Loading…</p> : null}

      {!loading && tab === 'sales' && data?.kpis ? (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <DashboardStatCard label="Revenue" value={money(data.kpis.revenue)} change={ch.revenue} />
            <DashboardStatCard label="Orders" value={String(data.kpis.orderCount)} change={ch.orderCount} />
            <DashboardStatCard label="AOV" value={moneyPrecise(data.kpis.aov)} change={ch.aov} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
            <SalesOverTimeChart series={data.salesSeries} />
            <SalesDailyTable series={data.salesSeries} />
          </div>
        </div>
      ) : null}

      {!loading && tab === 'conversion' && data?.kpis ? (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <DashboardStatCard label="Conversion rate" value={pct(data.kpis.conversionRate, 2)} suffix=" sessions → orders" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FunnelChart stages={data.funnel} />
            <FunnelBreakdownTable stages={data.funnel} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PageActivityTable items={data.topPages} />
            <SlowPagesTable items={data.slowPages} />
          </div>
        </div>
      ) : null}

      {!loading && tab === 'products' && data ? (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <TopProductsChart items={data.topProducts} />
            <TopProductsTable items={data.topProducts} />
          </div>
        </div>
      ) : null}

      {!loading && tab === 'customers' && data ? (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <DashboardStatCard label="Returning orders" value={String(data.returningOrders ?? 0)} />
            <DashboardStatCard label="New customer orders" value={String(data.newCustomerOrders ?? 0)} />
            <DashboardStatCard label="Guest checkout" value={String(data.guestOrders ?? 0)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <CustomerSplitChart
              guestOrders={data.guestOrders}
              newCustomerOrders={data.newCustomerOrders}
              returningOrders={data.returningOrders}
            />
            <TopCustomersTable items={data.topCustomers} />
          </div>
        </div>
      ) : null}

      {!loading && tab === 'marketing' && data ? (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <DashboardStatCard label="Promo redemptions" value={String(data.totalRedemptions ?? 0)} />
            <DashboardStatCard label="Discount given" value={money(data.totalDiscount ?? 0)} />
            <DashboardStatCard
              label="Reviews pending"
              value={String(data.reviews?.pending ?? 0)}
            />
            <DashboardStatCard
              label="Avg rating"
              value={data.reviews?.avgRating != null ? `${data.reviews.avgRating}★` : '—'}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PromoRedemptionsChart promos={data.promos} />
            <PromoPerformanceTable promos={data.promos} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <DashboardStatCard label="Submitted (range)" value={String(data.reviews?.submittedInRange ?? 0)} />
            <DashboardStatCard label="Approved (range)" value={String(data.reviews?.approvedInRange ?? 0)} />
            <DashboardStatCard label="Rejected (range)" value={String(data.reviews?.rejectedInRange ?? 0)} />
          </div>
        </div>
      ) : null}

      {!loading && tab === 'operations' && data ? (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <DashboardStatCard
              label="Avg ship time"
              value={data.fulfillment?.avgHoursToShip != null ? `${data.fulfillment.avgHoursToShip}h` : '—'}
              suffix=" paid → shipped"
            />
            <DashboardStatCard label="Shipped (range)" value={String(data.fulfillment?.shippedCount ?? 0)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <OrdersByStatusChart items={data.ordersByStatus} />
            <StatusCountTable items={data.ordersByStatus} title="Orders by status" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <StatusCountTable items={data.restockByStatus} title="Restock requests" />
            <LowStockTable items={data.lowStock} />
          </div>
          <PreorderPipelineTable items={data.preorders} />
        </div>
      ) : null}

      {!loading && tab === 'catalog' && data ? (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <CatalogRevenueChart items={data.byCategory} title="Revenue by category" />
            <CatalogBreakdownTable items={data.byCategory} title="Categories (detail)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <CatalogRevenueChart items={data.byBrand} title="Revenue by brand" />
            <CatalogBreakdownTable items={data.byBrand} title="Brands (detail)" />
          </div>
        </div>
      ) : null}

      {!loading && tab === 'experience' && data ? (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <DashboardStatCard label="Cart sessions" value={String(data.cartSessions ?? 0)} />
            <DashboardStatCard label="Reached checkout" value={String(data.checkoutSessions ?? 0)} />
            <DashboardStatCard
              label="Left before checkout"
              value={data.cartAbandonmentRate != null ? pct(data.cartAbandonmentRate, 1) : '—'}
              suffix=" of cart sessions"
            />
            <DashboardStatCard
              label="Cart → checkout"
              value={data.cartToCheckoutRate != null ? pct(data.cartToCheckoutRate, 1) : '—'}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <EventCountsChart items={data.eventCounts} />
            <ReferrersChart items={data.topReferrers} />
          </div>
          <ReferrersTable items={data.topReferrers} />
        </div>
      ) : null}
    </div>
  );
}
