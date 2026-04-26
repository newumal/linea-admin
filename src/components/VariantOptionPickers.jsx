import { normHexClient } from './variantOptionUtils.js';

/**
 * @param {{ value: string, onChange: (v: string) => void, sizes: { id: string, label: string }[], disabled?: boolean }} props
 */
export function VariantSizeSelect({ value, onChange, sizes, disabled = false }) {
  const labels = sizes.map((s) => s.label);
  const inList = labels.includes(value);
  const selectVal = inList ? value : '__custom__';

  return (
    <div>
      <select
        className="input sm"
        disabled={disabled}
        value={selectVal}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') {
            onChange('');
            return;
          }
          onChange(v);
        }}
      >
        <option value="">— Size —</option>
        {sizes.map((s) => (
          <option key={s.id} value={s.label}>
            {s.label}
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </select>
      {!inList ? (
        <input
          className="input sm"
          style={{ marginTop: 6 }}
          placeholder="Custom size"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   colorName: string,
 *   colorHex: string,
 *   onColorChange: (p: { colorName: string, colorHex: string }) => void,
 *   colors: { id: string, name: string, colorHex: string }[],
 *   disabled?: boolean
 * }} props
 */
export function VariantColorSelect({ colorName, colorHex, onColorChange, colors, disabled = false }) {
  const match = colors.find(
    (c) => c.name === String(colorName ?? '').trim() && normHexClient(c.colorHex) === normHexClient(colorHex),
  );
  const selectValue = match?.id ?? '__custom__';

  return (
    <div>
      <select
        className="input sm"
        disabled={disabled}
        value={selectValue}
        onChange={(e) => {
          const id = e.target.value;
          if (id === '') {
            onColorChange({ colorName: '', colorHex: '#000000' });
            return;
          }
          if (id === '__custom__') {
            onColorChange({ colorName: '', colorHex: normHexClient(colorHex) });
            return;
          }
          const c = colors.find((x) => x.id === id);
          if (c) onColorChange({ colorName: c.name, colorHex: normHexClient(c.colorHex) });
        }}
      >
        <option value="">— Color —</option>
        {colors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.colorHex})
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </select>
      {selectValue === '__custom__' ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <input
            className="input sm"
            placeholder="Name"
            disabled={disabled}
            value={colorName}
            onChange={(e) => onColorChange({ colorName: e.target.value, colorHex })}
          />
          <input
            className="input sm mono"
            placeholder="#aabbcc"
            disabled={disabled}
            value={colorHex}
            onChange={(e) => onColorChange({ colorName, colorHex: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
