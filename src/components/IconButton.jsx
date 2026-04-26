const ICONS = {
  edit: (
    <path d="M4 14.5V18h3.5L17.8 7.7l-3.5-3.5L4 14.5Zm11-11 1.3-1.3a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L18.5 7 15 3.5Z" />
  ),
  save: <path d="M5 3h10l4 4v14H5V3Zm3 0v6h7V3m-7 14h8v-5H8v5Z" />,
  cancel: <path d="m6 6 12 12M18 6 6 18" />,
  archive: <path d="M4 7h16M6 7v12h12V7M8 4h8l2 3H6l2-3Zm2 7h4" />,
  activate: <path d="m5 12 4 4L19 6" />,
  remove: <path d="M6 7h12M9 7V5h6v2m-7 0 1 12h6l1-12" />,
};

export function IconButton({ icon, label, onClick, disabled = false, type = 'button' }) {
  return (
    <button
      type={type}
      className="icon-btn"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {ICONS[icon]}
      </svg>
    </button>
  );
}
