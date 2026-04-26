const listeners = new Set();

export function uiEmit(event) {
  for (const fn of listeners) fn(event);
}

export function uiSubscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

