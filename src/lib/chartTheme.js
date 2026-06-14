/** Recharts palette — vivid but readable on light/dark admin shell. */
export const CHART_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ef4444', // red
  '#84cc16', // lime
];

export const CHART_FUNNEL = ['#6366f1', '#818cf8', '#a78bfa', '#22c55e'];

export const CHART_AREA = {
  stroke: '#6366f1',
  fill: '#6366f1',
  fillOpacity: 0.22,
};

export function colorAt(i) {
  return CHART_COLORS[i % CHART_COLORS.length];
}
