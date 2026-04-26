import { copyText } from '../lib/clipboard.js';

export function CopyButton({ value, label = 'Copy', copiedLabel = 'Copied' }) {
  return (
    <button
      type="button"
      className="icon-btn admin-copy-btn"
      onClick={() => void copyText(value, { label: copiedLabel })}
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 9h10v10H9z" />
        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
      </svg>
    </button>
  );
}

