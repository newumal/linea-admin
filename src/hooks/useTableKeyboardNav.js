import { useEffect, useMemo, useState } from 'react';

/**
 * Keyboard navigation for tables:
 * - Up/Down: move active row
 * - Enter: open row
 * - Space: toggle row selection (optional)
 */
export function useTableKeyboardNav({
  enabled = true,
  rows,
  getRowId,
  onOpenRow,
  onToggleRow,
  captureWhen = () => true,
}) {
  const ids = useMemo(() => (rows || []).map((r) => getRowId(r)), [rows, getRowId]);
  const [activeId, setActiveId] = useState(ids[0] ?? null);

  useEffect(() => {
    if (!ids.includes(activeId)) setActiveId(ids[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derived from ids
  }, [ids.join('|')]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      if (!captureWhen(e)) return;
      if (ids.length === 0) return;
      const idx = activeId == null ? -1 : ids.indexOf(activeId);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = ids[Math.min(ids.length - 1, Math.max(0, idx + 1))];
        setActiveId(next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = ids[Math.max(0, idx <= 0 ? 0 : idx - 1)];
        setActiveId(next);
      } else if (e.key === 'Enter') {
        if (!onOpenRow) return;
        e.preventDefault();
        const id = activeId ?? ids[0];
        onOpenRow(id);
      } else if (e.key === ' ' || e.code === 'Space') {
        if (!onToggleRow) return;
        e.preventDefault();
        const id = activeId ?? ids[0];
        onToggleRow(id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, ids, activeId, onOpenRow, onToggleRow, captureWhen]);

  return { activeId, setActiveId };
}

