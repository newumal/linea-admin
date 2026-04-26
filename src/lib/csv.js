function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function downloadCsv({ filename, columns, rows }) {
  const cols = (columns || []).filter((c) => c && c.key);
  const head = cols.map((c) => csvEscape(c.label ?? c.key)).join(',');
  const body = (rows || [])
    .map((r) => cols.map((c) => csvEscape(typeof c.value === 'function' ? c.value(r) : r?.[c.key])).join(','))
    .join('\n');
  const csv = `${head}\n${body}\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

