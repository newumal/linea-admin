import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_AREA, CHART_COLORS, CHART_FUNNEL, colorAt } from '../../lib/chartTheme.js';
import { fmtDay, moneyPrecise } from '../../lib/dashboardFormat.js';
import { ChartPanel } from './DashboardWidgets.jsx';

const axisStyle = { fontSize: 11, fill: 'var(--mute)' };
const gridStroke = 'var(--line, #ddd)';

const tooltipStyle = {
  borderRadius: 4,
  border: '1px solid var(--line)',
  background: 'var(--surface, #fff)',
  fontSize: 12,
};

export function SalesOverTimeChart({ series }) {
  const data = (series ?? []).map((r) => ({
    day: fmtDay(r.day),
    revenue: r.revenue,
    orders: r.orders,
  }));

  return (
    <ChartPanel title="Sales over time" empty={data.length ? null : 'No paid orders in this range.'}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_AREA.fill} stopOpacity={0.45} />
                <stop offset="100%" stopColor={CHART_AREA.fill} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="day" tick={axisStyle} />
            <YAxis yAxisId="left" tick={axisStyle} tickFormatter={(v) => `$${v}`} width={52} />
            <YAxis yAxisId="right" orientation="right" tick={axisStyle} width={32} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, name) => (name === 'revenue' ? moneyPrecise(v) : v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={CHART_AREA.stroke}
              strokeWidth={2}
              fill="url(#salesGrad)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              name="Orders"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, fill: '#22c55e' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function FunnelChart({ stages }) {
  const data = (stages ?? []).map((s, i) => ({
    name: s.label.replace(' (page views)', '').replace(' started', ''),
    count: s.count,
    rate: s.rate,
    fill: CHART_FUNNEL[i] ?? colorAt(i),
  }));

  return (
    <ChartPanel title="Conversion funnel" empty={data.some((d) => d.count > 0) ? null : 'No events yet — browse the storefront to populate.'}>
      {data.some((d) => d.count > 0) ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={axisStyle} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={axisStyle} width={108} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, _n, item) => [`${v} (${Number(item.payload.rate).toFixed(1)}%)`, 'Count']}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function TopProductsChart({ items }) {
  const data = (items ?? []).slice(0, 8).map((r, i) => ({
    name: r.name?.length > 22 ? `${r.name.slice(0, 22)}…` : r.name,
    revenue: r.revenue,
    units: r.units,
    fill: colorAt(i),
  }));

  return (
    <ChartPanel title="Top products" empty={data.length ? null : 'No product sales in this range.'}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={axisStyle} tickFormatter={(v) => `$${v}`} />
            <YAxis type="category" dataKey="name" tick={axisStyle} width={100} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => moneyPrecise(v)} />
            <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function SlowPagesTable({ items }) {
  return (
    <ChartPanel
      title="Slow pages (≥50 views)"
      empty={items?.length ? null : 'Need 50+ views per path — see Top pages table below.'}
    >
      {items?.length ? (
        <table className="admin-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Path</th>
              <th>Views</th>
              <th>Avg duration</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.path}>
                <td className="mono">{row.path}</td>
                <td>{row.views}</td>
                <td>{(row.avgDurationMs / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ChartPanel>
  );
}

export function PreorderPipelineTable({ items }) {
  if (!items?.length) {
    return <ChartPanel title="Pre-order pipeline" empty="No pre-orders." />;
  }
  return (
    <ChartPanel title="Pre-order pipeline">
      <table className="admin-table" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            <th>Status</th>
            <th>Ship month</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={`${row.status}-${row.shipMonth}`}>
              <td className="mono">{row.status}</td>
              <td>{row.shipMonth || '—'}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ChartPanel>
  );
}

export function CustomerSplitChart({ guestOrders, newCustomerOrders, returningOrders }) {
  const data = [
    { name: 'Returning', value: returningOrders ?? 0, fill: CHART_COLORS[0] },
    { name: 'New customers', value: newCustomerOrders ?? 0, fill: CHART_COLORS[1] },
    { name: 'Guest checkout', value: guestOrders ?? 0, fill: CHART_COLORS[2] },
  ].filter((d) => d.value > 0);

  return (
    <ChartPanel title="Orders by customer type" empty={data.length ? null : 'No orders in this range.'}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={96} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function PromoRedemptionsChart({ promos }) {
  const data = (promos ?? []).slice(0, 8).map((p, i) => ({
    name: p.code?.length > 14 ? `${p.code.slice(0, 14)}…` : p.code,
    redemptions: p.redemptions,
    fill: colorAt(i),
  }));

  return (
    <ChartPanel title="Promo redemptions" empty={data.length ? null : 'No promo redemptions in this range.'}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={axisStyle} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={axisStyle} width={88} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="redemptions" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function OrdersByStatusChart({ items }) {
  const data = (items ?? []).map((row, i) => ({
    name: row.status,
    count: row.count,
    fill: colorAt(i),
  }));

  return (
    <ChartPanel title="Orders by status" empty={data.length ? null : 'No orders in this range.'}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="name" tick={axisStyle} />
            <YAxis tick={axisStyle} allowDecimals={false} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function CatalogRevenueChart({ items, title }) {
  const data = (items ?? []).slice(0, 8).map((r, i) => ({
    name: r.label?.length > 18 ? `${r.label.slice(0, 18)}…` : r.label,
    revenue: r.revenue,
    fill: colorAt(i),
  }));

  return (
    <ChartPanel title={title} empty={data.length ? null : 'No sales in this range.'}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={axisStyle} tickFormatter={(v) => `$${v}`} />
            <YAxis type="category" dataKey="name" tick={axisStyle} width={88} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => moneyPrecise(v)} />
            <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function EventCountsChart({ items }) {
  const data = (items ?? []).map((row, i) => ({
    name: row.eventType?.replace(/_/g, ' '),
    count: row.count,
    fill: colorAt(i),
  }));

  return (
    <ChartPanel title="Event volume" empty={data.length ? null : 'No storefront events yet — browse the site to populate.'}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="name" tick={axisStyle} />
            <YAxis tick={axisStyle} allowDecimals={false} width={40} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function ReferrersChart({ items }) {
  const data = (items ?? []).map((row, i) => ({
    name: row.source?.length > 20 ? `${row.source.slice(0, 20)}…` : row.source,
    count: row.count,
    fill: colorAt(i),
  }));

  return (
    <ChartPanel title="Top referrers" empty={data.length ? null : 'No page views in this range.'}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={axisStyle} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={axisStyle} width={100} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}
