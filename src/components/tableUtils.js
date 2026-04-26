export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sortRows(rows, sort) {
  if (!sort?.key) return rows;
  const dir = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (typeof av === 'number' || typeof bv === 'number') {
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    }
    return String(av ?? '').localeCompare(String(bv ?? ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    }) * dir;
  });
}
