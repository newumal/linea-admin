import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { CMS_WRITE_ROLES } from '../../auth/navConfig.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { IconButton } from '../../components/IconButton.jsx';
import { InfoPanel, SortButton, TableCount } from '../../components/TableTools.jsx';
import { sortRows } from '../../components/tableUtils.js';

const STOREFRONT_URL = (import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5180').replace(/\/$/, '');

const SLOT_OPTIONS = [
  {
    value: 'home_hero',
    label: 'Home hero',
    hint: 'Title: kicker|headline (pipe splits). Body = paragraph. Image = hero photo. Link = primary CTA.',
    previewPath: '/',
  },
  {
    value: 'announcement_bar',
    label: 'Announcement bar',
    hint: 'Title or body (max 120 chars). Use body newlines or | for multiple marquee messages.',
    previewPath: '/',
  },
];

function emptyForm(slot) {
  return {
    slot,
    locale: 'en',
    title: '',
    bodyMd: '',
    imageUrl: '',
    linkHref: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
    position: '0',
  };
}

function fromIsoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function statusStyle(status) {
  if (status === 'live') return { color: 'var(--accent, #2d6a4f)' };
  if (status === 'scheduled') return { color: 'var(--ink)' };
  if (status === 'expired') return { color: 'var(--mute)' };
  return { color: '#b4542e' };
}

function blockToForm(block) {
  return {
    slot: block.slot,
    locale: block.locale || 'en',
    title: block.title ?? '',
    bodyMd: block.bodyMd ?? '',
    imageUrl: block.imageUrl ?? '',
    linkHref: block.linkHref ?? '',
    startsAt: fromIsoToLocalInput(block.startsAt),
    endsAt: fromIsoToLocalInput(block.endsAt),
    isActive: block.isActive !== false,
    position: String(block.position ?? 0),
  };
}

function formToBody(form, isNew) {
  const body = {
    slot: form.slot,
    locale: form.locale || 'en',
    title: form.title.trim() || null,
    bodyMd: form.bodyMd.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    linkHref: form.linkHref.trim() || null,
    startsAt: toIsoOrNull(form.startsAt),
    endsAt: toIsoOrNull(form.endsAt),
    isActive: form.isActive,
    position: parseInt(form.position, 10) || 0,
  };
  if (!isNew) {
    const { slot: _s, ...patch } = body;
    return patch;
  }
  return body;
}

export default function CmsSlotEditor() {
  const { hasRole } = useRole();
  const canWrite = hasRole(CMS_WRITE_ROLES);

  const [selectedSlot, setSelectedSlot] = useState('home_hero');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [sort, setSort] = useState({ key: 'position', dir: 'asc' });
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(() => emptyForm('home_hero'));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);

  const slotMeta = SLOT_OPTIONS.find((s) => s.value === selectedSlot) ?? SLOT_OPTIONS[0];
  const isNew = !editingId;

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch(
        ADMIN.cms({ slot: selectedSlot, locale: 'en', limit: '50', offset: '0' }),
        { auth: true },
      );
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message || 'Failed to load blocks');
    } finally {
      setLoading(false);
    }
  }, [selectedSlot]);

  /* eslint-disable react-hooks/set-state-in-effect -- slot change */
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEditingId('');
    setForm(emptyForm(selectedSlot));
  }, [selectedSlot]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visibleItems = useMemo(() => sortRows(items, sort), [items, sort]);

  function startNew() {
    setEditingId('');
    setForm(emptyForm(selectedSlot));
    setInfo('');
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm(blockToForm(row));
    setInfo('');
  }

  function bumpPreview() {
    setIframeKey((k) => k + 1);
  }

  async function saveBlock(e) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setErr('');
    setInfo('');
    try {
      if (isNew) {
        await apiFetch(ADMIN.cms(), { method: 'POST', body: formToBody(form, true), auth: true });
        setInfo('Block created — refresh preview to see live content.');
      } else {
        await apiFetch(ADMIN.cmsBlock(editingId), { method: 'PATCH', body: formToBody(form, false), auth: true });
        setInfo('Block saved — refresh preview to see live content.');
      }
      startNew();
      await load();
      bumpPreview();
    } catch (e2) {
      setErr(e2.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !canWrite) return;
    setErr('');
    try {
      await apiFetch(ADMIN.cmsBlock(deleteTarget.id), { method: 'DELETE', auth: true });
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) startNew();
      setInfo('Block deleted.');
      await load();
      bumpPreview();
    } catch (e) {
      setErr(e.message || 'Delete failed');
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">CMS</h1>
      <p className="admin-page-sub">Storefront content slots — save publishes to the live site (no redeploy).</p>

      <InfoPanel title="Preview">
        <p style={{ margin: 0 }}>
          Iframe loads <span className="mono">{STOREFRONT_URL}</span>. Content appears after save when the block is{' '}
          <strong>live</strong> (active + within schedule). Run the storefront on the theme branch at port 5180.
        </p>
      </InfoPanel>

      <div className="admin-toolbar" style={{ marginTop: 20 }}>
        <div className="admin-filters-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label" htmlFor="cms-slot">Slot</label>
            <select
              id="cms-slot"
              className="input"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              {SLOT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p className="admin-muted" style={{ fontSize: 12, marginTop: 8 }}>{slotMeta.hint}</p>
          </div>
          {canWrite ? (
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="button" className="btn sm" onClick={startNew}>
                New block
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {err ? <p className="admin-err">{err}</p> : null}
      {info ? <p className="admin-muted" style={{ marginTop: 12 }}>{info}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start', marginTop: 24 }}>
        <div>
          {loading ? <p className="admin-muted">Loading blocks…</p> : null}
          {!loading ? (
            <div className="admin-table-wrap" style={{ marginBottom: 24 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th><SortButton label="#" column="position" sort={sort} onSort={setSort} /></th>
                    <th><SortButton label="Title" column="title" sort={sort} onSort={setSort} /></th>
                    <th><SortButton label="Status" column="status" sort={sort} onSort={setSort} /></th>
                    <th>Active</th>
                    {canWrite ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={canWrite ? 5 : 4} className="admin-muted">
                        No blocks for this slot — create one to populate the storefront.
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((row) => (
                      <tr key={row.id} style={{ background: editingId === row.id ? 'var(--bg-elev)' : undefined }}>
                        <td>{row.position}</td>
                        <td>
                          <button
                            type="button"
                            className="mono"
                            style={{ textAlign: 'left', fontWeight: editingId === row.id ? 700 : 400 }}
                            onClick={() => startEdit(row)}
                          >
                            {row.title || row.bodyMd?.slice(0, 40) || '—'}
                          </button>
                        </td>
                        <td>
                          <span className="mono" style={{ fontSize: 11, ...statusStyle(row.status) }}>
                            {row.status}
                          </span>
                        </td>
                        <td>{row.isActive ? 'Yes' : 'No'}</td>
                        {canWrite ? (
                          <td>
                            <div className="admin-row-actions">
                              <IconButton icon="edit" label="Edit block" onClick={() => startEdit(row)} />
                              <IconButton icon="archive" label="Delete block" onClick={() => setDeleteTarget(row)} />
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <TableCount shown={visibleItems.length} total={total} label="blocks" />
            </div>
          ) : null}

          <h2 className="caps" style={{ marginBottom: 12 }}>{isNew ? 'New block' : 'Edit block'}</h2>
          {canWrite ? (
            <form onSubmit={saveBlock} style={{ display: 'grid', gap: 14, maxWidth: 520 }}>
              <div>
                <label className="field-label" htmlFor="cms-title">Title</label>
                <input id="cms-title" className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="field-label" htmlFor="cms-body">Body (markdown)</label>
                <textarea
                  id="cms-body"
                  className="input"
                  rows={4}
                  value={form.bodyMd}
                  onChange={(e) => setForm((f) => ({ ...f, bodyMd: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="cms-image">Image URL</label>
                <input id="cms-image" className="input mono" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://…" />
              </div>
              <div>
                <label className="field-label" htmlFor="cms-link">Link href</label>
                <input id="cms-link" className="input mono" value={form.linkHref} onChange={(e) => setForm((f) => ({ ...f, linkHref: e.target.value }))} placeholder="/category/men or https://…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label" htmlFor="cms-starts">Starts</label>
                  <input id="cms-starts" className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label" htmlFor="cms-ends">Ends</label>
                  <input id="cms-ends" className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label" htmlFor="cms-pos">Position</label>
                  <input id="cms-pos" className="input mono" type="number" min="0" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
                </div>
                <div style={{ alignSelf: 'end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                    Active
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="submit" className="btn sm" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create block' : 'Save block'}</button>
                {!isNew ? (
                  <button type="button" className="btn ghost sm" onClick={startNew}>Cancel</button>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="admin-muted">Read-only — merchandiser or marketer role required to edit CMS.</p>
          )}
        </div>

        <div style={{ position: 'sticky', top: 88 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 className="caps">Live preview</h2>
            <button type="button" className="btn ghost sm" onClick={bumpPreview}>
              Refresh
            </button>
          </div>
          <div style={{ border: '1px solid var(--line)', background: '#fff', overflow: 'hidden' }}>
            <iframe
              key={iframeKey}
              title="Storefront preview"
              src={`${STOREFRONT_URL}${slotMeta.previewPath}`}
              style={{ width: '100%', height: 'min(72vh, 720px)', border: 0, display: 'block' }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
          <p className="admin-muted" style={{ fontSize: 11, marginTop: 8 }}>
            Preview reads persisted CMS via public API — not unsaved draft state.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete CMS block?"
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      >
        <p>Remove this block from slot <span className="mono">{deleteTarget?.slot}</span>? Storefront falls back to theme defaults if no other live block exists.</p>
      </ConfirmDialog>
    </div>
  );
}
