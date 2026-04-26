import { useMemo, useState } from 'react';

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function useColumnPrefs({ storageKey, columns }) {
  const base = useMemo(() => (columns || []).map((c) => ({ key: c.key, label: c.label, defaultHidden: !!c.defaultHidden })), [columns]);
  const [state, setState] = useState(() => {
    const initial = lsGet(storageKey, null);
    if (initial && Array.isArray(initial.order) && initial.hidden && typeof initial.hidden === 'object') return initial;
    const order = base.map((c) => c.key);
    const hidden = Object.fromEntries(base.filter((c) => c.defaultHidden).map((c) => [c.key, true]));
    return { order, hidden };
  });

  const ordered = useMemo(() => {
    const map = new Map((columns || []).map((c) => [c.key, c]));
    const order = [...state.order].filter((k) => map.has(k));
    for (const c of columns || []) if (!order.includes(c.key)) order.push(c.key);
    return order.map((k) => map.get(k)).filter(Boolean);
  }, [columns, state.order]);

  const visibleColumns = useMemo(() => ordered.filter((c) => !state.hidden?.[c.key]), [ordered, state.hidden]);

  const actions = useMemo(() => {
    function persist(next) {
      setState(next);
      lsSet(storageKey, next);
    }
    return {
      toggle(key) {
        const hidden = { ...(state.hidden || {}) };
        hidden[key] = !hidden[key];
        persist({ ...state, hidden });
      },
      move(key, dir) {
        const order = [...state.order];
        const i = order.indexOf(key);
        if (i < 0) return;
        const j = dir === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= order.length) return;
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
        persist({ ...state, order });
      },
      reset() {
        const order = base.map((c) => c.key);
        const hidden = Object.fromEntries(base.filter((c) => c.defaultHidden).map((c) => [c.key, true]));
        persist({ order, hidden });
      },
    };
  }, [state, storageKey, base]);

  return { visibleColumns, orderedColumns: ordered, columnState: state, ...actions };
}

export function ColumnControls({ open, onClose, columns, columnState, onToggle, onMove, onReset }) {
  if (!open) return null;
  return (
    <div className="admin-colctrl-backdrop" role="dialog" aria-modal="true" aria-label="Column controls" onMouseDown={onClose}>
      <div className="admin-colctrl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-colctrl-head">
          <div className="caps">Columns</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn ghost sm" onClick={onReset}>Reset</button>
            <button type="button" className="btn ghost sm" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="admin-colctrl-list">
          {(columns || []).map((c) => (
            <div key={c.key} className="admin-colctrl-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={!columnState.hidden?.[c.key]} onChange={() => onToggle(c.key)} />
                <span>{c.label || c.key}</span>
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn ghost sm" onClick={() => onMove(c.key, 'up')} title="Move up">↑</button>
                <button type="button" className="btn ghost sm" onClick={() => onMove(c.key, 'down')} title="Move down">↓</button>
              </div>
            </div>
          ))}
        </div>
        <div className="admin-muted" style={{ fontSize: 12, paddingTop: 10 }}>
          Saved to this browser.
        </div>
      </div>
    </div>
  );
}

