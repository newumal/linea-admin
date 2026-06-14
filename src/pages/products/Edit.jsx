import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ADMIN } from '../../api/endpoints.js';
import { useRole } from '../../auth/useRole.js';
import { MERCHANDISER_ROLES } from '../../auth/navConfig.js';
import { IconButton } from '../../components/IconButton.jsx';
import { VariantColorSelect, VariantSizeSelect } from '../../components/VariantOptionPickers.jsx';

const AUDIENCES = ['Women', 'Men', 'Unisex', 'Kids', 'Family'];
const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'variants', label: 'Variants' },
  { id: 'images', label: 'Images' },
  { id: 'seo', label: 'SEO' },
];

function emptyDetail() {
  return {
    slug: '',
    name: '',
    brandId: '',
    categoryId: '',
    audience: 'Women',
    description: '',
    material: '',
    fit: '',
    basePrice: '0',
    compareAt: '',
    currency: 'USD',
    isPreorder: false,
    preorderShipMonth: '',
    depositPct: '20',
    isActive: true,
    publishedAt: '',
    legacyCode: '',
  };
}

function emptySeo() {
  return { metaTitle: '', metaDescription: '', ogImage: '' };
}

export default function ProductEdit() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useRole();
  const canWrite = hasRole(MERCHANDISER_ROLES);

  const isNew = routeId === 'new';
  const productId = isNew ? null : routeId;

  const [tab, setTab] = useState('details');
  const [loading, setLoading] = useState(!isNew);
  const [err, setErr] = useState('');
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogSizes, setCatalogSizes] = useState([]);
  const [catalogColors, setCatalogColors] = useState([]);

  const [detail, setDetail] = useState(emptyDetail);
  const [seo, setSeo] = useState(emptySeo);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [draftVariants, setDraftVariants] = useState([{ sku: '', size: '', colorName: '', colorHex: '#000000', priceDelta: '0', stock: '0' }]);
  const [pendingImages, setPendingImages] = useState([{ url: '', alt: '', position: '0', isPrimary: false }]);

  const [newImage, setNewImage] = useState({ url: '', alt: '', position: '0', isPrimary: false });
  const [uploadFile, setUploadFile] = useState(null);
  const [newVar, setNewVar] = useState({ sku: '', size: '', colorName: '', colorHex: '#000000', priceDelta: '0', stock: '0' });
  const [editingVariantId, setEditingVariantId] = useState('');
  const [variantEdit, setVariantEdit] = useState({
    sku: '',
    size: '',
    colorName: '',
    colorHex: '',
    priceDelta: '0',
    stock: '0',
    isActive: true,
  });
  const [editingImageId, setEditingImageId] = useState('');
  const [imageEdit, setImageEdit] = useState({ url: '', alt: '', position: '0', isPrimary: false });

  const loadMeta = useCallback(async () => {
    try {
      const [b, c, sz, col] = await Promise.all([
        apiFetch(ADMIN.brands(), { auth: true }),
        apiFetch(ADMIN.categories(), { auth: true }),
        apiFetch(ADMIN.catalogSizes(), { auth: true }),
        apiFetch(ADMIN.catalogColors(), { auth: true }),
      ]);
      setBrands(b.items ?? []);
      setCategories(c.items ?? []);
      setCatalogSizes(sz.items ?? []);
      setCatalogColors(col.items ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load brands/categories');
    }
  }, []);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setErr('');
    try {
      const p = await apiFetch(ADMIN.product(productId), { auth: true });
      setDetail({
        slug: p.slug,
        name: p.name,
        brandId: p.brandId,
        categoryId: p.categoryId,
        audience: p.audience,
        description: p.description ?? '',
        material: p.material ?? '',
        fit: p.fit ?? '',
        basePrice: String(p.basePrice ?? 0),
        compareAt: p.compareAt != null ? String(p.compareAt) : '',
        currency: p.currency ?? 'USD',
        isPreorder: !!p.isPreorder,
        preorderShipMonth: p.preorderShipMonth ? String(p.preorderShipMonth).slice(0, 10) : '',
        depositPct: String(p.depositPct ?? 20),
        isActive: !!p.isActive,
        publishedAt: p.publishedAt ? String(p.publishedAt) : '',
        legacyCode: p.legacyCode ?? '',
      });
      setSeo({
        metaTitle: p.seo?.metaTitle ?? '',
        metaDescription: p.seo?.metaDescription ?? '',
        ogImage: p.seo?.ogImage ?? '',
      });
      setVariants(p.variants ?? []);
      setImages(p.images ?? []);
    } catch (e) {
      setErr(e.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount / id sync */
  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!isNew) void loadProduct();
  }, [isNew, loadProduct]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const bodyForCreate = useMemo(() => {
    const variantsPayload = (isNew ? draftVariants : [])
      .filter((v) => v.sku.trim())
      .map((v) => ({
        sku: v.sku.trim(),
        size: v.size.trim() || null,
        colorName: v.colorName.trim() || null,
        colorHex: v.colorHex.trim() || null,
        priceDelta: Number(v.priceDelta) || 0,
        stock: parseInt(v.stock, 10) || 0,
        isActive: true,
      }));
    const seoPayload =
      seo.metaTitle.trim() || seo.metaDescription.trim() || seo.ogImage.trim()
        ? {
            metaTitle: seo.metaTitle.trim() || null,
            metaDescription: seo.metaDescription.trim() || null,
            ogImage: seo.ogImage.trim() || null,
          }
        : undefined;
    return {
      slug: detail.slug.trim(),
      name: detail.name.trim(),
      brandId: detail.brandId,
      categoryId: detail.categoryId,
      audience: detail.audience,
      description: detail.description.trim() || null,
      material: detail.material.trim() || null,
      fit: detail.fit.trim() || null,
      basePrice: Number(detail.basePrice),
      compareAt: detail.compareAt.trim() === '' ? null : Number(detail.compareAt),
      currency: detail.currency || 'USD',
      isPreorder: detail.isPreorder,
      preorderShipMonth: detail.preorderShipMonth.trim() || null,
      depositPct: Number(detail.depositPct) || 20,
      isActive: detail.isActive,
      publishedAt: detail.publishedAt.trim() || null,
      legacyCode: detail.legacyCode.trim() || null,
      variants: variantsPayload.length ? variantsPayload : undefined,
      seo: seoPayload,
    };
  }, [detail, draftVariants, isNew, seo]);

  async function saveProductCreate() {
    setErr('');
    const created = await apiFetch(ADMIN.products(), { method: 'POST', body: bodyForCreate, auth: true });
    const newId = created.id;
    const imgs = pendingImages.filter((x) => x.url.trim());
    for (const img of imgs) {
      await apiFetch(ADMIN.productImages(newId), {
        method: 'POST',
        body: {
          url: img.url.trim(),
          alt: img.alt.trim() || null,
          position: parseInt(img.position, 10) || 0,
          isPrimary: !!img.isPrimary,
        },
        auth: true,
      });
    }
    navigate(`/products/${newId}`, { replace: true });
  }

  async function saveProductPatch() {
    setErr('');
    const compareAtVal = detail.compareAt.trim() === '' ? null : Number(detail.compareAt);
    await apiFetch(ADMIN.product(productId), {
      method: 'PATCH',
      body: {
        slug: detail.slug.trim(),
        name: detail.name.trim(),
        brandId: detail.brandId,
        categoryId: detail.categoryId,
        audience: detail.audience,
        description: detail.description.trim() || null,
        material: detail.material.trim() || null,
        fit: detail.fit.trim() || null,
        basePrice: Number(detail.basePrice),
        compareAt: compareAtVal,
        currency: detail.currency || 'USD',
        isPreorder: detail.isPreorder,
        preorderShipMonth: detail.preorderShipMonth.trim() || null,
        depositPct: Number(detail.depositPct) || 20,
        isActive: detail.isActive,
        publishedAt: detail.publishedAt.trim() || null,
        legacyCode: detail.legacyCode.trim() || null,
      },
      auth: true,
    });
    await loadProduct();
  }

  async function saveSeo() {
    setErr('');
    await apiFetch(ADMIN.product(productId), {
      method: 'PATCH',
      body: {
        seo: {
          metaTitle: seo.metaTitle.trim() || null,
          metaDescription: seo.metaDescription.trim() || null,
          ogImage: seo.ogImage.trim() || null,
        },
      },
      auth: true,
    });
    await loadProduct();
  }

  async function deactivateProduct() {
    if (!window.confirm('Deactivate this product? It will be hidden from the storefront.')) return;
    setErr('');
    await apiFetch(ADMIN.product(productId), { method: 'DELETE', auth: true });
    await loadProduct();
  }

  async function patchVariant(vid, payload) {
    setErr('');
    await apiFetch(ADMIN.productVariant(vid), { method: 'PATCH', body: payload, auth: true });
    await loadProduct();
  }

  function startVariantEdit(v) {
    setEditingVariantId(v.id);
    setVariantEdit({
      sku: v.sku ?? '',
      size: v.size ?? '',
      colorName: v.colorName ?? '',
      colorHex: v.colorHex ?? '',
      priceDelta: String(v.priceDelta ?? 0),
      stock: String(v.stock ?? 0),
      isActive: Boolean(v.isActive),
    });
  }

  async function saveVariantEdit(vid) {
    await patchVariant(vid, {
      sku: variantEdit.sku.trim(),
      size: variantEdit.size.trim() || null,
      colorName: variantEdit.colorName.trim() || null,
      colorHex: variantEdit.colorHex.trim() || null,
      priceDelta: Number(variantEdit.priceDelta) || 0,
      stock: parseInt(variantEdit.stock, 10) || 0,
      isActive: variantEdit.isActive,
    });
    setEditingVariantId('');
  }

  async function removeVariant(vid) {
    if (!window.confirm('Remove this variant? Variants already used by orders will be deactivated instead.')) return;
    setErr('');
    await apiFetch(ADMIN.productVariant(vid), { method: 'DELETE', auth: true });
    if (editingVariantId === vid) setEditingVariantId('');
    await loadProduct();
  }

  async function addVariant() {
    if (!productId) return;
    if (!newVar.sku.trim()) {
      setErr('SKU required');
      return;
    }
    setErr('');
    await apiFetch(ADMIN.productVariants(productId), {
      method: 'POST',
      body: {
        sku: newVar.sku.trim(),
        size: newVar.size.trim() || null,
        colorName: newVar.colorName.trim() || null,
        colorHex: newVar.colorHex.trim() || null,
        priceDelta: Number(newVar.priceDelta) || 0,
        stock: parseInt(newVar.stock, 10) || 0,
        isActive: true,
      },
      auth: true,
    });
    setNewVar({ sku: '', size: '', colorName: '', colorHex: '#000000', priceDelta: '0', stock: '0' });
    await loadProduct();
  }

  async function addImageRow() {
    if (!productId) return;
    if (!newImage.url.trim()) {
      setErr('Image URL required');
      return;
    }
    setErr('');
    await apiFetch(ADMIN.productImages(productId), {
      method: 'POST',
      body: {
        url: newImage.url.trim(),
        alt: newImage.alt.trim() || null,
        position: parseInt(newImage.position, 10) || 0,
        isPrimary: !!newImage.isPrimary,
      },
      auth: true,
    });
    setNewImage({ url: '', alt: '', position: '0', isPrimary: false });
    await loadProduct();
  }

  async function uploadImageFile() {
    if (!productId || !uploadFile) {
      setErr('Choose a JPEG or PNG file first');
      return;
    }
    setErr('');
    const form = new FormData();
    form.append('file', uploadFile);
    if (newImage.alt.trim()) form.append('alt', newImage.alt.trim());
    form.append('position', String(parseInt(newImage.position, 10) || 0));
    form.append('isPrimary', String(!!newImage.isPrimary));
    await apiFetch(ADMIN.productImageUpload(productId), { method: 'POST', body: form, auth: true });
    setUploadFile(null);
    setNewImage({ url: '', alt: '', position: '0', isPrimary: false });
    await loadProduct();
  }

  async function deleteImage(imageId) {
    if (!window.confirm('Remove this image?')) return;
    setErr('');
    await apiFetch(ADMIN.productImage(imageId), { method: 'DELETE', auth: true });
    await loadProduct();
  }

  function startImageEdit(img) {
    setEditingImageId(img.id);
    setImageEdit({
      url: img.url ?? '',
      alt: img.alt ?? '',
      position: String(img.position ?? 0),
      isPrimary: Boolean(img.isPrimary),
    });
  }

  async function saveImageEdit(imageId) {
    setErr('');
    await apiFetch(ADMIN.productImage(imageId), {
      method: 'PATCH',
      body: {
        url: imageEdit.url.trim(),
        alt: imageEdit.alt.trim() || null,
        position: parseInt(imageEdit.position, 10) || 0,
        isPrimary: imageEdit.isPrimary,
      },
      auth: true,
    });
    setEditingImageId('');
    await loadProduct();
  }

  const title = isNew ? 'New product' : detail.name || 'Product';

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/products" className="admin-muted" style={{ fontSize: 13 }}>
          ← Products
        </Link>
      </div>
      <h1 className="admin-page-title">{title}</h1>
      <p className="admin-page-sub">Tabs for details, variants, URL-based images, and SEO metadata.</p>

      {err ? <p className="admin-err">{err}</p> : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'chip active' : 'chip'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !isNew ? <p className="admin-muted">Loading…</p> : null}

      {tab === 'details' && (!loading || isNew) ? (
        <div style={{ maxWidth: 720 }}>
          <div className="admin-filters-grid" style={{ marginBottom: 16 }}>
            <div>
              <label className="field-label" htmlFor="slug">Slug</label>
              <input id="slug" className="input mono" value={detail.slug} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, slug: e.target.value }))} />
            </div>
            <div>
              <label className="field-label" htmlFor="name">Name</label>
              <input id="name" className="input" value={detail.name} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className="field-label" htmlFor="brand">Brand</label>
              <select id="brand" className="input" value={detail.brandId} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, brandId: e.target.value }))}>
                <option value="">Select…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="cat">Category</label>
              <select id="cat" className="input" value={detail.categoryId} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, categoryId: e.target.value }))}>
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="aud">Audience</label>
              <select id="aud" className="input" value={detail.audience} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, audience: e.target.value }))}>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="bp">Base price</label>
              <input id="bp" className="input" type="number" step="0.01" value={detail.basePrice} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, basePrice: e.target.value }))} />
            </div>
            <div>
              <label className="field-label" htmlFor="ca">Compare at</label>
              <input id="ca" className="input" type="number" step="0.01" value={detail.compareAt} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, compareAt: e.target.value }))} />
            </div>
            <div>
              <label className="field-label" htmlFor="cur">Currency</label>
              <input id="cur" className="input mono" maxLength={3} value={detail.currency} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="field-label" htmlFor="desc">Description</label>
              <textarea id="desc" className="input" rows={4} value={detail.description} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, description: e.target.value }))} />
            </div>
            <div>
              <label className="field-label" htmlFor="mat">Material</label>
              <input id="mat" className="input" value={detail.material} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, material: e.target.value }))} />
            </div>
            <div>
              <label className="field-label" htmlFor="fit">Fit</label>
              <input id="fit" className="input" value={detail.fit} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, fit: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">
                <input type="checkbox" checked={detail.isPreorder} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, isPreorder: e.target.checked }))} />{' '}
                Pre-order
              </label>
            </div>
            <div>
              <label className="field-label" htmlFor="psm">Preorder ship month</label>
              <input id="psm" className="input" type="date" value={detail.preorderShipMonth} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, preorderShipMonth: e.target.value }))} />
            </div>
            <div>
              <label className="field-label" htmlFor="dep">Deposit %</label>
              <input id="dep" className="input" type="number" value={detail.depositPct} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, depositPct: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">
                <input type="checkbox" checked={detail.isActive} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, isActive: e.target.checked }))} />{' '}
                Active
              </label>
            </div>
            <div>
              <label className="field-label" htmlFor="leg">Legacy code</label>
              <input id="leg" className="input mono" value={detail.legacyCode} disabled={!canWrite} onChange={(e) => setDetail((d) => ({ ...d, legacyCode: e.target.value }))} />
            </div>
          </div>
          {canWrite ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {isNew ? (
                <button type="button" className="btn" onClick={() => void saveProductCreate().catch((e) => setErr(e.message || 'Save failed'))}>
                  Create product
                </button>
              ) : (
                <>
                  <button type="button" className="btn" onClick={() => void saveProductPatch().catch((e) => setErr(e.message || 'Save failed'))}>
                    Save details
                  </button>
                  <button type="button" className="btn ghost" onClick={() => void deactivateProduct().catch((e) => setErr(e.message || 'Failed'))}>
                    Deactivate
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="admin-muted">Read-only (merchandiser role required to edit).</p>
          )}
        </div>
      ) : null}

      {tab === 'variants' && (!loading || isNew) ? (
        <div>
          {isNew ? (
            <p className="admin-muted" style={{ marginBottom: 12 }}>Optional initial variants (included when you create the product).</p>
          ) : null}
          <p className="admin-muted" style={{ marginBottom: 12 }}>
            Sizes and colors are chosen from{' '}
            <Link to="/catalog/options">catalog options</Link>
            {' '}(or use &quot;Custom…&quot; for one-off values).
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>Δ price</th>
                  <th>Stock</th>
                  <th>Active</th>
                  {canWrite ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {(isNew ? draftVariants : variants).map((v, idx) =>
                  isNew ? (
                    <tr key={`d-${idx}`}>
                      <td>
                        <input className="input mono sm" value={v.sku} onChange={(e) => {
                          const next = [...draftVariants];
                          next[idx] = { ...next[idx], sku: e.target.value };
                          setDraftVariants(next);
                        }}
                        />
                      </td>
                      <td>
                        <VariantSizeSelect
                          value={v.size}
                          sizes={catalogSizes}
                          disabled={!canWrite}
                          onChange={(size) => {
                            const next = [...draftVariants];
                            next[idx] = { ...next[idx], size };
                            setDraftVariants(next);
                          }}
                        />
                      </td>
                      <td>
                        <VariantColorSelect
                          colorName={v.colorName}
                          colorHex={v.colorHex}
                          colors={catalogColors}
                          disabled={!canWrite}
                          onColorChange={(p) => {
                            const next = [...draftVariants];
                            next[idx] = { ...next[idx], colorName: p.colorName, colorHex: p.colorHex };
                            setDraftVariants(next);
                          }}
                        />
                      </td>
                      <td>
                        <input className="input sm" type="number" value={v.priceDelta} onChange={(e) => {
                          const next = [...draftVariants];
                          next[idx] = { ...next[idx], priceDelta: e.target.value };
                          setDraftVariants(next);
                        }}
                        />
                      </td>
                      <td>
                        <input className="input sm" type="number" value={v.stock} onChange={(e) => {
                          const next = [...draftVariants];
                          next[idx] = { ...next[idx], stock: e.target.value };
                          setDraftVariants(next);
                        }}
                        />
                      </td>
                      <td>Yes</td>
                      {canWrite ? (
                        <td>
                          <div className="admin-row-actions">
                            <IconButton
                              icon="remove"
                              label="Remove variant row"
                              disabled={draftVariants.length === 1}
                              onClick={() => setDraftVariants((rows) => rows.filter((_, rowIdx) => rowIdx !== idx))}
                            />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ) : (
                    <tr key={v.id}>
                      {editingVariantId === v.id ? (
                        <>
                          <td><input className="input sm mono" value={variantEdit.sku} onChange={(e) => setVariantEdit((x) => ({ ...x, sku: e.target.value }))} /></td>
                          <td>
                            <VariantSizeSelect
                              value={variantEdit.size}
                              sizes={catalogSizes}
                              disabled={!canWrite}
                              onChange={(size) => setVariantEdit((x) => ({ ...x, size }))}
                            />
                          </td>
                          <td>
                            <VariantColorSelect
                              colorName={variantEdit.colorName}
                              colorHex={variantEdit.colorHex}
                              colors={catalogColors}
                              disabled={!canWrite}
                              onColorChange={(p) =>
                                setVariantEdit((x) => ({ ...x, colorName: p.colorName, colorHex: p.colorHex }))
                              }
                            />
                          </td>
                          <td><input className="input sm" type="number" value={variantEdit.priceDelta} onChange={(e) => setVariantEdit((x) => ({ ...x, priceDelta: e.target.value }))} /></td>
                          <td><input className="input sm" type="number" value={variantEdit.stock} onChange={(e) => setVariantEdit((x) => ({ ...x, stock: e.target.value }))} /></td>
                          <td><input type="checkbox" checked={variantEdit.isActive} onChange={(e) => setVariantEdit((x) => ({ ...x, isActive: e.target.checked }))} /></td>
                          <td>
                            <div className="admin-row-actions">
                              <IconButton icon="save" label="Save variant" onClick={() => void saveVariantEdit(v.id).catch((e) => setErr(e.message || 'Save failed'))} />
                              <IconButton icon="cancel" label="Cancel edit" onClick={() => setEditingVariantId('')} />
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="mono">{v.sku}</td>
                          <td>{v.size || '—'}</td>
                          <td>
                            {v.colorName || '—'}
                            {v.colorHex ? <span className="mono"> {v.colorHex}</span> : null}
                          </td>
                          <td>{v.priceDelta}</td>
                          <td>{v.stock}</td>
                          <td>{v.isActive ? 'Yes' : 'No'}</td>
                          {canWrite ? (
                            <td>
                              <div className="admin-row-actions">
                                <IconButton icon="edit" label="Edit variant" onClick={() => startVariantEdit(v)} />
                                <IconButton
                                  icon="activate"
                                  label={v.isActive ? 'Deactivate variant' : 'Activate variant'}
                                  onClick={() => void patchVariant(v.id, { isActive: !v.isActive }).catch((e) => setErr(e.message || 'Failed'))}
                                />
                                <IconButton icon="remove" label="Remove variant" onClick={() => void removeVariant(v.id).catch((e) => setErr(e.message || 'Remove failed'))} />
                              </div>
                            </td>
                          ) : null}
                        </>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          {isNew ? (
            <button type="button" className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => setDraftVariants((d) => [...d, { sku: '', size: '', colorName: '', colorHex: '#000000', priceDelta: '0', stock: '0' }])}>
              Add variant row
            </button>
          ) : null}
          {!isNew && canWrite ? (
            <div style={{ marginTop: 20, padding: 16, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}>
              <h3 className="caps" style={{ marginBottom: 12 }}>Add variant</h3>
              <div className="admin-filters-grid">
                <div>
                  <label className="field-label">SKU</label>
                  <input className="input mono" value={newVar.sku} onChange={(e) => setNewVar((x) => ({ ...x, sku: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Size</label>
                  <VariantSizeSelect value={newVar.size} sizes={catalogSizes} disabled={!canWrite} onChange={(size) => setNewVar((x) => ({ ...x, size }))} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="field-label">Color</label>
                  <VariantColorSelect
                    colorName={newVar.colorName}
                    colorHex={newVar.colorHex}
                    colors={catalogColors}
                    disabled={!canWrite}
                    onColorChange={(p) => setNewVar((x) => ({ ...x, colorName: p.colorName, colorHex: p.colorHex }))}
                  />
                </div>
                <div>
                  <label className="field-label">Δ price</label>
                  <input className="input" type="number" value={newVar.priceDelta} onChange={(e) => setNewVar((x) => ({ ...x, priceDelta: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Stock</label>
                  <input className="input" type="number" value={newVar.stock} onChange={(e) => setNewVar((x) => ({ ...x, stock: e.target.value }))} />
                </div>
              </div>
              <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => void addVariant().catch((e) => setErr(e.message || 'Failed'))}>
                Add variant
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'images' && (!loading || isNew) ? (
        <div style={{ maxWidth: 720 }}>
          {isNew ? (
            <>
              <p className="admin-muted" style={{ marginBottom: 12 }}>
                Queued images are POSTed right after the product is created (URL only — no upload in MVP).
              </p>
              {pendingImages.map((img, idx) => (
                <div key={`pi-${idx}`} className="admin-filters-grid" style={{ marginBottom: 12 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">Image URL</label>
                    <input
                      className="input mono"
                      value={img.url}
                      onChange={(e) => {
                        const next = [...pendingImages];
                        next[idx] = { ...next[idx], url: e.target.value };
                        setPendingImages(next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="field-label">Alt</label>
                    <input
                      className="input"
                      value={img.alt}
                      onChange={(e) => {
                        const next = [...pendingImages];
                        next[idx] = { ...next[idx], alt: e.target.value };
                        setPendingImages(next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="field-label">Position</label>
                    <input
                      className="input"
                      type="number"
                      value={img.position}
                      onChange={(e) => {
                        const next = [...pendingImages];
                        next[idx] = { ...next[idx], position: e.target.value };
                        setPendingImages(next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="field-label">
                      <input
                        type="checkbox"
                        checked={img.isPrimary}
                        onChange={(e) => {
                          const next = [...pendingImages];
                          next[idx] = { ...next[idx], isPrimary: e.target.checked };
                          setPendingImages(next);
                        }}
                      />{' '}
                      Primary
                    </label>
                  </div>
                  {canWrite ? (
                    <div style={{ alignSelf: 'end' }}>
                      <IconButton
                        icon="remove"
                        label="Remove image row"
                        disabled={pendingImages.length === 1}
                        onClick={() => setPendingImages((rows) => rows.filter((_, rowIdx) => rowIdx !== idx))}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setPendingImages((p) => [...p, { url: '', alt: '', position: '0', isPrimary: false }])}
              >
                Add image row
              </button>
            </>
          ) : (
            <>
              <div className="admin-table-wrap" style={{ marginBottom: 20 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>URL</th>
                      <th>Alt</th>
                      <th>Pos</th>
                      <th>Primary</th>
                      {canWrite ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {images.map((im) => (
                      <tr key={im.id}>
                        {editingImageId === im.id ? (
                          <>
                            <td style={{ width: 72 }}>
                              {imageEdit.url ? <img src={imageEdit.url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 2 }} /> : '—'}
                            </td>
                            <td>
                              <input className="input mono" value={imageEdit.url} onChange={(e) => setImageEdit((x) => ({ ...x, url: e.target.value }))} />
                            </td>
                            <td>
                              <input className="input" value={imageEdit.alt} onChange={(e) => setImageEdit((x) => ({ ...x, alt: e.target.value }))} />
                            </td>
                            <td>
                              <input className="input" type="number" value={imageEdit.position} onChange={(e) => setImageEdit((x) => ({ ...x, position: e.target.value }))} />
                            </td>
                            <td>
                              <input type="checkbox" checked={imageEdit.isPrimary} onChange={(e) => setImageEdit((x) => ({ ...x, isPrimary: e.target.checked }))} />
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                <IconButton icon="save" label="Save image" onClick={() => void saveImageEdit(im.id).catch((e) => setErr(e.message || 'Save failed'))} />
                                <IconButton icon="cancel" label="Cancel edit" onClick={() => setEditingImageId('')} />
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ width: 72 }}>
                              <img src={im.url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 2 }} />
                            </td>
                            <td className="mono" style={{ fontSize: 12, maxWidth: 280, wordBreak: 'break-all' }}>
                              {im.url}
                            </td>
                            <td>{im.alt || '—'}</td>
                            <td>{im.position}</td>
                            <td>{im.isPrimary ? 'Yes' : 'No'}</td>
                            {canWrite ? (
                              <td>
                                <div className="admin-row-actions">
                                  <IconButton icon="edit" label="Edit image" onClick={() => startImageEdit(im)} />
                                  <IconButton icon="remove" label="Remove image" onClick={() => void deleteImage(im.id).catch((e) => setErr(e.message || 'Failed'))} />
                                </div>
                              </td>
                            ) : null}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {images.length === 0 ? <p className="admin-muted" style={{ padding: 12 }}>No images yet.</p> : null}
              </div>
              {canWrite ? (
                <div style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}>
                  <h3 className="caps" style={{ marginBottom: 12 }}>Add image</h3>
                  <div style={{ marginBottom: 16 }}>
                    <label className="field-label">Upload a file (JPEG / PNG, ≤5MB)</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="btn sm"
                        disabled={!uploadFile}
                        onClick={() => void uploadImageFile().catch((e) => setErr(e.message || 'Upload failed'))}
                      >
                        Upload file
                      </button>
                    </div>
                    <p className="admin-muted" style={{ marginTop: 4 }}>
                      Stored on object storage. Uses the Alt / Position / Primary below.
                    </p>
                  </div>
                  <div className="admin-filters-grid">
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="field-label">Image URL (or paste a URL)</label>
                      <input className="input mono" value={newImage.url} onChange={(e) => setNewImage((x) => ({ ...x, url: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Alt</label>
                      <input className="input" value={newImage.alt} onChange={(e) => setNewImage((x) => ({ ...x, alt: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Position</label>
                      <input className="input" type="number" value={newImage.position} onChange={(e) => setNewImage((x) => ({ ...x, position: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">
                        <input type="checkbox" checked={newImage.isPrimary} onChange={(e) => setNewImage((x) => ({ ...x, isPrimary: e.target.checked }))} />{' '}
                        Primary
                      </label>
                    </div>
                  </div>
                  <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => void addImageRow().catch((e) => setErr(e.message || 'Failed'))}>
                    Add image
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === 'seo' && (!loading || isNew) ? (
        <div style={{ maxWidth: 560 }}>
          <p className="admin-muted" style={{ marginBottom: 12 }}>
            Stored as product attributes (MVP). Leave blank to omit from meta tags.
          </p>
          <div style={{ marginBottom: 12 }}>
            <label className="field-label" htmlFor="mt">Meta title</label>
            <input id="mt" className="input" value={seo.metaTitle} disabled={!canWrite} onChange={(e) => setSeo((s) => ({ ...s, metaTitle: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="field-label" htmlFor="md">Meta description</label>
            <textarea id="md" className="input" rows={3} value={seo.metaDescription} disabled={!canWrite} onChange={(e) => setSeo((s) => ({ ...s, metaDescription: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="field-label" htmlFor="og">OG image URL</label>
            <input id="og" className="input mono" value={seo.ogImage} disabled={!canWrite} onChange={(e) => setSeo((s) => ({ ...s, ogImage: e.target.value }))} />
          </div>
          {canWrite ? (
            isNew ? (
              <p className="admin-muted">SEO values are saved when you create the product (include in create request).</p>
            ) : (
              <button type="button" className="btn" onClick={() => void saveSeo().catch((e) => setErr(e.message || 'Save failed'))}>
                Save SEO
              </button>
            )
          ) : (
            <p className="admin-muted">Read-only.</p>
          )}
        </div>
      ) : null}

    </div>
  );
}
