import { uiEmit } from './uiBus.js';

export async function copyText(text, { label = 'Copied' } = {}) {
  const t = String(text ?? '');
  if (!t) return;
  try {
    await navigator.clipboard.writeText(t);
    uiEmit({ type: 'toast', tone: 'success', message: label });
  } catch {
    uiEmit({ type: 'toast', tone: 'error', message: 'Copy failed' });
  }
}

