/** @param {string | null | undefined} h */
export function normHexClient(h) {
  if (h == null || h === '') return '#000000';
  const raw = String(h).trim();
  const s = raw.startsWith('#') ? raw : `#${raw}`;
  return s.length === 7 ? s.toLowerCase() : raw.toLowerCase();
}
