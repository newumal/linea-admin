import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { ADMIN } from '../api/endpoints.js';
import { useRole } from '../auth/useRole.js';
import { ORDER_OPS_ROLES, MARKETER_ROLES, MERCHANDISER_ROLES, RESTOCK_ROLES } from '../auth/navConfig.js';
import {
  FunnelChart,
  PreorderPipelineTable,
  SalesOverTimeChart,
  SlowPagesTable,
  TopProductsChart,
} from '../components/dashboard/DashboardCharts.jsx';
import {
  FunnelBreakdownTable,
  OpsSignalsTable,
  PageActivityTable,
  SalesDailyTable,
  TopProductsTable,
} from '../components/dashboard/DashboardTables.jsx';
import { DashboardStatCard, RangeSelect } from '../components/dashboard/DashboardWidgets.jsx';
import { money, moneyPrecise, pct } from '../lib/dashboardFormat.js';

const OPS_ROLES = {
  ORDER_OPS: ORDER_OPS_ROLES,
  MERCHANDISER: MERCHANDISER_ROLES,
  RESTOCK: RESTOCK_ROLES,
  MARKETER: MARKETER_ROLES,
};

export default function Dashboard() {
  const { hasRole } = useRole();
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [kpis, setKpis] = useState(null);
  const [salesSeries, setSalesSeries] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [slowPages, setSlowPages] = useState([]);
  const [topPages, setTopPages] = useState([]);
  const [preorders, setPreorders] = useState([]);
  const [actions, setActions] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const q = { range, compare: 'true' };
      const [k, sales, fun, top, slow, pages, pipe, act] = await Promise.all([
        apiFetch(ADMIN.dashboardKpis(q), { auth: true }),
        apiFetch(ADMIN.dashboardSalesOverTime({ range }), { auth: true }),
        apiFetch(ADMIN.dashboardFunnel({ range }), { auth: true }),
        apiFetch(ADMIN.dashboardTopProducts({ range, limit: '10' }), { auth: true }),
        apiFetch(ADMIN.dashboardSlowPages({ range, minViews: '50' }), { auth: true }),
        apiFetch(ADMIN.dashboardTopPages({ range, limit: '10' }), { auth: true }),
        apiFetch(ADMIN.dashboardPreorderPipeline(), { auth: true }),
        apiFetch(ADMIN.dashboardActionItems(), { auth: true }),
      ]);
      setKpis(k);
      setSalesSeries(sales.series ?? []);
      setFunnel(fun.stages ?? []);
      setTopProducts(top.items ?? []);
      setSlowPages(slow.items ?? []);
      setTopPages(pages.items ?? []);
      setPreorders(pipe.items ?? []);
      setActions(act);
    } catch (e) {
      setErr(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [range]);

  /* eslint-disable react-hooks/set-state-in-effect -- load on range change */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const ch = kpis?.change ?? {};
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-sub">Charts for trends, tables for exact breakdowns — revenue, funnel, products, and ops.</p>
        </div>
        <RangeSelect value={range} onChange={setRange} />
      </div>

      {err ? <p className="admin-err">{err}</p> : null}
      {loading && !kpis ? <p className="admin-muted">Loading…</p> : null}

      {kpis ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginTop: 24,
            }}
          >
            <DashboardStatCard label="Revenue" value={money(kpis.revenue)} change={ch.revenue} />
            <DashboardStatCard label="Orders" value={String(kpis.orderCount)} change={ch.orderCount} />
            <DashboardStatCard label="AOV" value={moneyPrecise(kpis.aov)} change={ch.aov} />
            <DashboardStatCard label="Conversion" value={pct(kpis.conversionRate, 2)} suffix=" of sessions" />
            <DashboardStatCard label="Returning" value={pct(kpis.returningCustomerRate, 1)} suffix=" of orders" />
            <DashboardStatCard label="Refund rate" value={pct(kpis.refundRate, 1)} />
          </div>

          <div style={{ ...grid2, marginTop: 24 }} className="dashboard-charts-grid">
            <SalesOverTimeChart series={salesSeries} />
            <SalesDailyTable series={salesSeries} />
          </div>

          <div style={grid2}>
            <FunnelChart stages={funnel} />
            <FunnelBreakdownTable stages={funnel} />
          </div>

          <div style={grid2}>
            <TopProductsChart items={topProducts} />
            <TopProductsTable items={topProducts} />
          </div>

          <div style={grid2}>
            <PageActivityTable items={topPages} />
            <SlowPagesTable items={slowPages} />
          </div>

          <div style={grid2}>
            {hasRole(ORDER_OPS_ROLES) ? <PreorderPipelineTable items={preorders} /> : null}
            <OpsSignalsTable actions={actions} hasRole={hasRole} roles={OPS_ROLES} />
          </div>
        </>
      ) : null}
    </div>
  );
}
