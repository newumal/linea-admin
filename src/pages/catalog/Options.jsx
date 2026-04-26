import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { MERCHANDISER_ROLES } from '../../auth/navConfig.js';
import { IconButton } from '../../components/IconButton.jsx';
import { InfoPanel, SortButton, TableCount } from '../../components/TableTools.jsx';
import { sortRows } from '../../components/tableUtils.js';

const SECTIONS = [
  { id: 'sizes', label: 'Sizes' },
  { id: 'colors', label: 'Colors' },
];

export default function CatalogOptionsPage() {
  const { hasRole } = useRole();
  const canWrite = hasRole(MERCHANDISER_ROLES);

  const [section, setSection] = useState('sizes');
  const [err, setErr] = useState('');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [sort, setSort] = useState({ key: 'sortOrder', dir: 'asc' });

  const [newSize, setNewSize] = useState({ label: '', sortOrder: '0', isActive: true });
  const [newColor, setNewColor] = useState({ name: '', colorHex: '#000000', sortOrder: '0', isActive: true });

  const [editingSizeId, setEditingSizeId] = useState('');
  const [sizeEdit, setSizeEdit] = useState({ label: '', sortOrder: '0', isActive: true });

  const [editingColorId, setEditingColorId] = useState('');
  const [colorEdit, setColorEdit] = useState({ name: '', colorHex: '#000000', sortOrder: '0', isActive: true });

  const load = useCallback(async () => {
    setErr('');
    try {
      const [sz, col] = await Promise.all([
        apiFetch(ADMIN.catalogSizes({ includeInactive: 'true' }), { auth: true }),
        apiFetch(ADMIN.catalogColors({ includeInactive: 'true' }), { auth: true }),
      ]);
      setSizes(sz.items ?? []);
      setColors(col.items ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load catalog options');
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- initial load */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sortedSizes = useMemo(() => sortRows(sizes, sort), [sizes, sort]);
  const sortedColors = useMemo(() => sortRows(colors, sort), [colors, sort]);

  async function addSize() {
    if (!newSize.label.trim()) {
      setErr('Size label required');
      return;
    }
    setErr('');
    await apiFetch(ADMIN.catalogSizes(), {
      method: 'POST',
      body: {
        label: newSize.label.trim(),
        sortOrder: parseInt(newSize.sortOrder, 10) || 0,
        isActive: newSize.isActive,
      },
      auth: true,
    });
    setNewSize({ label: '', sortOrder: '0', isActive: true });
    await load();
  }

  async function addColor() {
    if (!newColor.name.trim()) {
      setErr('Color name required');
      return;
    }
    setErr('');
    await apiFetch(ADMIN.catalogColors(), {
      method: 'POST',
      body: {
        name: newColor.name.trim(),
        colorHex: newColor.colorHex.trim(),
        sortOrder: parseInt(newColor.sortOrder, 10) || 0,
        isActive: newColor.isActive,
      },
      auth: true,
    });
    setNewColor({ name: '', colorHex: '#000000', sortOrder: '0', isActive: true });
    await load();
  }

  function startSizeEdit(row) {
    setEditingSizeId(row.id);
    setSizeEdit({
      label: row.label,
      sortOrder: String(row.sortOrder ?? 0),
      isActive: !!row.isActive,
    });
  }

  async function saveSize(id) {
    setErr('');
    await apiFetch(ADMIN.catalogSize(id), {
      method: 'PATCH',
      body: {
        label: sizeEdit.label.trim(),
        sortOrder: parseInt(sizeEdit.sortOrder, 10) || 0,
        isActive: sizeEdit.isActive,
      },
      auth: true,
    });
    setEditingSizeId('');
    await load();
  }

  function startColorEdit(row) {
    setEditingColorId(row.id);
    setColorEdit({
      name: row.name,
      colorHex: row.colorHex,
      sortOrder: String(row.sortOrder ?? 0),
      isActive: !!row.isActive,
    });
  }

  async function saveColor(id) {
    setErr('');
    await apiFetch(ADMIN.catalogColor(id), {
      method: 'PATCH',
      body: {
        name: colorEdit.name.trim(),
        colorHex: colorEdit.colorHex.trim(),
        sortOrder: parseInt(colorEdit.sortOrder, 10) || 0,
        isActive: colorEdit.isActive,
      },
      auth: true,
    });
    setEditingColorId('');
    await load();
  }

  async function removeSize(id) {
    if (!window.confirm('Delete this size? Existing variants keep their stored label.')) return;
    setErr('');
    await apiFetch(ADMIN.catalogSize(id), { method: 'DELETE', auth: true });
    await load();
  }

  async function removeColor(id) {
    if (!window.confirm('Delete this color? Existing variants keep their stored name and hex.')) return;
    setErr('');
    await apiFetch(ADMIN.catalogColor(id), { method: 'DELETE', auth: true });
    await load();
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/products" className="admin-muted" style={{ fontSize: 13 }}>
          ← Products
        </Link>
      </div>
      <h1 className="admin-page-title">Sizes & colors</h1>
      <p className="admin-page-sub">
        Central lists used in product variants. Inactive rows are hidden from variant pickers but stay in the database for history.
      </p>

      <InfoPanel title="How this ties to variants">
        <p style={{ margin: 0 }}>
          When you add or edit a variant, size and color are chosen from these lists (or &quot;Custom…&quot; for one-off values).
          Changing a label here does not rename existing variants automatically.
        </p>
      </InfoPanel>

      {err ? <p className="admin-err">{err}</p> : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '20px 0', borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className={section === s.id ? 'chip active' : 'chip'} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'sizes' ? (
        <div>
          <TableCount shown={sortedSizes.length} total={sortedSizes.length} label="sizes" />
          {canWrite ? (
            <div className="admin-filters-grid" style={{ marginBottom: 16, maxWidth: 640 }}>
              <div>
                <label className="field-label">New label</label>
                <input className="input" value={newSize.label} onChange={(e) => setNewSize((x) => ({ ...x, label: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Sort</label>
                <input className="input" type="number" value={newSize.sortOrder} onChange={(e) => setNewSize((x) => ({ ...x, sortOrder: e.target.value }))} />
              </div>
              <div style={{ alignSelf: 'end' }}>
                <label className="field-label">
                  <input type="checkbox" checked={newSize.isActive} onChange={(e) => setNewSize((x) => ({ ...x, isActive: e.target.checked }))} /> Active
                </label>
              </div>
              <div style={{ alignSelf: 'end' }}>
                <button type="button" className="btn sm" onClick={() => void addSize().catch((e) => setErr(e.message || 'Failed'))}>
                  Add size
                </button>
              </div>
            </div>
          ) : null}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    <SortButton label="Label" column="label" sort={sort} onSort={setSort} />
                  </th>
                  <th>
                    <SortButton label="Sort" column="sortOrder" sort={sort} onSort={setSort} />
                  </th>
                  <th>Active</th>
                  {canWrite ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortedSizes.map((row) =>
                  editingSizeId === row.id ? (
                    <tr key={row.id}>
                      <td>
                        <input className="input sm" value={sizeEdit.label} onChange={(e) => setSizeEdit((x) => ({ ...x, label: e.target.value }))} />
                      </td>
                      <td>
                        <input className="input sm" type="number" value={sizeEdit.sortOrder} onChange={(e) => setSizeEdit((x) => ({ ...x, sortOrder: e.target.value }))} />
                      </td>
                      <td>
                        <input type="checkbox" checked={sizeEdit.isActive} onChange={(e) => setSizeEdit((x) => ({ ...x, isActive: e.target.checked }))} />
                      </td>
                      {canWrite ? (
                        <td>
                          <div className="admin-row-actions">
                            <IconButton icon="save" label="Save" onClick={() => void saveSize(row.id).catch((e) => setErr(e.message || 'Failed'))} />
                            <IconButton icon="cancel" label="Cancel" onClick={() => setEditingSizeId('')} />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ) : (
                    <tr key={row.id}>
                      <td>{row.label}</td>
                      <td>{row.sortOrder}</td>
                      <td>{row.isActive ? 'Yes' : 'No'}</td>
                      {canWrite ? (
                        <td>
                          <div className="admin-row-actions">
                            <IconButton icon="edit" label="Edit" onClick={() => startSizeEdit(row)} />
                            <IconButton icon="remove" label="Delete" onClick={() => void removeSize(row.id).catch((e) => setErr(e.message || 'Failed'))} />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {section === 'colors' ? (
        <div>
          <TableCount shown={sortedColors.length} total={sortedColors.length} label="colors" />
          {canWrite ? (
            <div className="admin-filters-grid" style={{ marginBottom: 16, maxWidth: 720 }}>
              <div>
                <label className="field-label">New name</label>
                <input className="input" value={newColor.name} onChange={(e) => setNewColor((x) => ({ ...x, name: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Hex</label>
                <input className="input mono" value={newColor.colorHex} onChange={(e) => setNewColor((x) => ({ ...x, colorHex: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Sort</label>
                <input className="input" type="number" value={newColor.sortOrder} onChange={(e) => setNewColor((x) => ({ ...x, sortOrder: e.target.value }))} />
              </div>
              <div style={{ alignSelf: 'end' }}>
                <label className="field-label">
                  <input type="checkbox" checked={newColor.isActive} onChange={(e) => setNewColor((x) => ({ ...x, isActive: e.target.checked }))} /> Active
                </label>
              </div>
              <div style={{ alignSelf: 'end' }}>
                <button type="button" className="btn sm" onClick={() => void addColor().catch((e) => setErr(e.message || 'Failed'))}>
                  Add color
                </button>
              </div>
            </div>
          ) : null}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    <SortButton label="Name" column="name" sort={sort} onSort={setSort} />
                  </th>
                  <th>
                    <SortButton label="Hex" column="colorHex" sort={sort} onSort={setSort} />
                  </th>
                  <th>
                    <SortButton label="Sort" column="sortOrder" sort={sort} onSort={setSort} />
                  </th>
                  <th>Active</th>
                  {canWrite ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortedColors.map((row) =>
                  editingColorId === row.id ? (
                    <tr key={row.id}>
                      <td>
                        <input className="input sm" value={colorEdit.name} onChange={(e) => setColorEdit((x) => ({ ...x, name: e.target.value }))} />
                      </td>
                      <td>
                        <input className="input sm mono" value={colorEdit.colorHex} onChange={(e) => setColorEdit((x) => ({ ...x, colorHex: e.target.value }))} />
                      </td>
                      <td>
                        <input className="input sm" type="number" value={colorEdit.sortOrder} onChange={(e) => setColorEdit((x) => ({ ...x, sortOrder: e.target.value }))} />
                      </td>
                      <td>
                        <input type="checkbox" checked={colorEdit.isActive} onChange={(e) => setColorEdit((x) => ({ ...x, isActive: e.target.checked }))} />
                      </td>
                      {canWrite ? (
                        <td>
                          <div className="admin-row-actions">
                            <IconButton icon="save" label="Save" onClick={() => void saveColor(row.id).catch((e) => setErr(e.message || 'Failed'))} />
                            <IconButton icon="cancel" label="Cancel" onClick={() => setEditingColorId('')} />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ) : (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td className="mono">{row.colorHex}</td>
                      <td>{row.sortOrder}</td>
                      <td>{row.isActive ? 'Yes' : 'No'}</td>
                      {canWrite ? (
                        <td>
                          <div className="admin-row-actions">
                            <IconButton icon="edit" label="Edit" onClick={() => startColorEdit(row)} />
                            <IconButton icon="remove" label="Delete" onClick={() => void removeColor(row.id).catch((e) => setErr(e.message || 'Failed'))} />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!canWrite ? <p className="admin-muted">Read-only (merchandiser role required to edit).</p> : null}
    </div>
  );
}
