import { pct } from '../../lib/dashboardFormat.js';

export function DashboardStatCard({ label, value, change, suffix }) {
  const changeNum = change != null ? Number(change) : null;
  const changeColor =
    changeNum == null ? 'var(--mute)' : changeNum >= 0 ? 'var(--accent, #2d6a4f)' : '#b4542e';

  return (
    <div style={{ padding: 16, border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
      <div className="field-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
        {value}
        {suffix ? <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--mute)' }}>{suffix}</span> : null}
      </div>
      {changeNum != null ? (
        <div className="mono" style={{ fontSize: 11, marginTop: 8, color: changeColor }}>
          {pct(changeNum)} vs prior period
        </div>
      ) : null}
    </div>
  );
}

export function RangeSelect({ value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="field-label" style={{ margin: 0 }}>Range</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>
    </label>
  );
}

export function ChartPanel({ title, children, empty }) {
  return (
    <div style={{ border: '1px solid var(--line)', padding: 20, background: 'var(--bg-elev)' }}>
      <div className="field-label" style={{ marginBottom: 16 }}>{title}</div>
      {empty ? <p className="admin-muted" style={{ margin: 0 }}>{empty}</p> : children}
    </div>
  );
}
