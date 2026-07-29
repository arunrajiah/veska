'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Tag,
  Percent,
  ChevronDown,
  ChevronUp,
  Plus,
  Copy,
  CheckCircle,
  XCircle,
  X,
  Trash2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...apiHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function fmt(v: number | undefined | null, currency = 'USD'): string {
  if (v == null || isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductVariant {
  id: string;
  sku: string;
  name?: string;
  attributes?: Record<string, string>;
  price: number;
  compare_at_price?: number;
  cost?: number;
  stock: number;
  weight?: number;
  is_default?: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'draft';
  variants?: ProductVariant[];
}

interface PriceListItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name?: string;
  variant_sku?: string;
  fixed_price?: number;
  percentage_adjustment?: number;
  min_quantity?: number;
}

interface PriceList {
  id: string;
  name: string;
  description?: string;
  currency: string;
  type: 'fixed' | 'percentage';
  adjustment?: number;
  start_date?: string;
  end_date?: string;
  is_default?: boolean;
  status?: 'active' | 'inactive';
  items?: PriceListItem[];
}

interface Discount {
  id: string;
  name: string;
  code?: string;
  type: 'percentage' | 'fixed' | 'bogo';
  value: number;
  min_order_value?: number;
  max_uses?: number;
  used_count?: number;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'inactive' | 'expired';
  applicable_to?: 'all' | 'products';
  product_ids?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  draft: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-500',
};

const ATTR_COLORS = [
  'bg-blue-50 text-blue-700',
  'bg-violet-50 text-violet-700',
  'bg-pink-50 text-pink-700',
  'bg-emerald-50 text-emerald-700',
  'bg-orange-50 text-orange-700',
];

function attrColor(i: number) {
  return ATTR_COLORS[i % ATTR_COLORS.length];
}

// ─── Slide-Over Shell ─────────────────────────────────────────────────────────

function SlideOver({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">{children}</div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
          {footer}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';
const selectCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'products' | 'pricelists' | 'discounts';

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'products', label: 'Products', Icon: ShoppingBag },
  { id: 'pricelists', label: 'Price Lists', Icon: Tag },
  { id: 'discounts', label: 'Discounts', Icon: Percent },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

// ─── New Variant Inline Form ──────────────────────────────────────────────────

interface AttributeRow {
  key: string;
  value: string;
}

function AddVariantForm({
  productId,
  onSaved,
  onCancel,
}: {
  productId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [compareAt, setCompareAt] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('0');
  const [weight, setWeight] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [attrs, setAttrs] = useState<AttributeRow[]>([{ key: '', value: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addAttr = () => setAttrs((a) => [...a, { key: '', value: '' }]);
  const removeAttr = (i: number) => setAttrs((a) => a.filter((_, idx) => idx !== i));
  const updateAttr = (i: number, field: 'key' | 'value', val: string) =>
    setAttrs((a) => a.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const handleSave = async () => {
    if (!sku.trim()) {
      setError('SKU is required');
      return;
    }
    if (!price) {
      setError('Price is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const attributes: Record<string, string> = {};
      attrs.forEach(({ key, value }) => {
        if (key.trim()) attributes[key.trim()] = value;
      });
      await apiFetch(`/catalog/products/${productId}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          sku: sku.trim(),
          name: name.trim() || undefined,
          price: parseFloat(price),
          compare_at_price: compareAt ? parseFloat(compareAt) : undefined,
          cost: cost ? parseFloat(cost) : undefined,
          stock: parseInt(stock, 10) || 0,
          weight: weight ? parseFloat(weight) : undefined,
          is_default: isDefault,
          attributes,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save variant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td colSpan={8} className="px-6 py-4 bg-indigo-50/40">
        <p className="text-xs font-semibold text-gray-700 mb-3">Add variant</p>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">SKU *</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={inputCls}
              placeholder="SKU-001"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Optional display name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputCls}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Compare-at price</label>
            <input
              type="number"
              value={compareAt}
              onChange={(e) => setCompareAt(e.target.value)}
              className={inputCls}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cost</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={inputCls}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stock</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={inputCls}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputCls}
              placeholder="0.0"
              step="0.01"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              Default variant
            </label>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">Attributes</p>
          <div className="space-y-2">
            {attrs.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => updateAttr(i, 'key', e.target.value)}
                  placeholder="Key (e.g. Color)"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateAttr(i, 'value', e.target.value)}
                  placeholder="Value (e.g. Red)"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={() => removeAttr(i)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addAttr}
            className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Plus size={11} /> Add attribute
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Save variant'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Variants Sub-Table ───────────────────────────────────────────────────────

function VariantsRow({
  product,
  onVariantChange,
}: {
  product: Product;
  onVariantChange: () => void;
}) {
  const [addingVariant, setAddingVariant] = useState(false);
  const variants = product.variants ?? [];

  const handleDelete = async (variantId: string) => {
    if (!confirm('Delete this variant?')) return;
    try {
      await apiFetch(`/catalog/products/${product.id}/variants/${variantId}`, { method: 'DELETE' });
      onVariantChange();
    } catch (err) {
      console.error('Failed to delete variant', err);
    }
  };

  return (
    <>
      <tr className="bg-gray-50/60">
        <td colSpan={8} className="px-6 py-0">
          <div className="py-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Variants</p>
            {variants.length === 0 ? (
              <p className="text-xs text-gray-400">No variants yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">SKU</th>
                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">Attributes</th>
                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">Price</th>
                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">Compare-at</th>
                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">Stock</th>
                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">Default</th>
                    <th className="pb-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 font-mono text-gray-700">{v.sku}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(v.attributes ?? {}).map(([k, val], i) => (
                            <span
                              key={k}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${attrColor(i)}`}
                            >
                              <span className="font-medium">{k}:</span> {val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-gray-900">{fmt(v.price)}</td>
                      <td className="py-2 pr-4 text-gray-400 line-through">
                        {v.compare_at_price ? fmt(v.compare_at_price) : '—'}
                      </td>
                      <td className="py-2 pr-4 text-gray-700">{v.stock}</td>
                      <td className="py-2 pr-4">
                        {v.is_default && (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </td>
      </tr>
      {addingVariant ? (
        <AddVariantForm
          productId={product.id}
          onSaved={() => {
            setAddingVariant(false);
            onVariantChange();
          }}
          onCancel={() => setAddingVariant(false)}
        />
      ) : (
        <tr className="bg-gray-50/60">
          <td colSpan={8} className="pb-3 px-6">
            <button
              onClick={() => setAddingVariant(true)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Plus size={12} /> Add variant
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── New Product Slide-Over ───────────────────────────────────────────────────

function NewProductForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('piece');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch('/catalog/products', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          unit,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          status: 'active',
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      title="New Product"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Create Product'}
          </button>
        </>
      }
    >
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Field label="Name *">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Product name"
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Short description…"
        />
      </Field>
      <Field label="Category">
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputCls}
          placeholder="e.g. Electronics"
        />
      </Field>
      <Field label="Unit">
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectCls}>
          <option value="piece">Piece</option>
          <option value="kg">Kilogram (kg)</option>
          <option value="g">Gram (g)</option>
          <option value="l">Litre (L)</option>
          <option value="m">Metre (m)</option>
          <option value="hour">Hour</option>
          <option value="day">Day</option>
          <option value="box">Box</option>
          <option value="pack">Pack</option>
        </select>
      </Field>
      <Field label="Tags (comma-separated)">
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className={inputCls}
          placeholder="tag1, tag2, tag3"
        />
      </Field>
    </SlideOver>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await apiFetch<Product[]>('/catalog/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      // keep existing
    }
  }, []);

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q);
  });

  const priceRange = (variants: ProductVariant[] = []): string => {
    if (variants.length === 0) return '—';
    const prices = variants.map((v) => v.price).filter((p) => p != null);
    if (prices.length === 0) return '—';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return fmt(min);
    return `${fmt(min)} – ${fmt(max)}`;
  };

  const totalStock = (variants: ProductVariant[] = []) =>
    variants.reduce((s, v) => s + (v.stock ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={() => setShowNewProduct(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} />
          New product
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-sm text-gray-400 text-center">No products found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Unit</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Variants</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Price range
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const isExpanded = expandedId === product.id;
                const variants = product.variants ?? [];
                return (
                  <>
                    <tr
                      key={product.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : product.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.tags && product.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {product.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{product.category ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{product.unit ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{variants.length}</td>
                      <td className="px-4 py-3 text-gray-700">{priceRange(variants)}</td>
                      <td className="px-4 py-3 text-gray-700">{totalStock(variants)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[product.status ?? 'active'] ?? STATUS_BADGE.active}`}
                        >
                          {product.status ?? 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : product.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={14} /> Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} /> View variants
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <VariantsRow
                        key={`${product.id}-variants`}
                        product={product}
                        onVariantChange={fetchProducts}
                      />
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showNewProduct && (
        <NewProductForm
          onClose={() => setShowNewProduct(false)}
          onSaved={async () => {
            setShowNewProduct(false);
            await fetchProducts();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRICE LISTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

// ─── New Price List Slide-Over ────────────────────────────────────────────────

function NewPriceListForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [type, setType] = useState<'fixed' | 'percentage'>('fixed');
  const [adjustment, setAdjustment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch('/catalog/price-lists', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          currency,
          type,
          adjustment: adjustment ? parseFloat(adjustment) : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          is_default: isDefault,
          status: 'active',
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create price list');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      title="New Price List"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Create Price List'}
          </button>
        </>
      }
    >
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Field label="Name *">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="e.g. VIP Customer Pricing"
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={selectCls}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
        </Field>
        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'fixed' | 'percentage')}
            className={selectCls}
          >
            <option value="fixed">Fixed</option>
            <option value="percentage">Percentage</option>
          </select>
        </Field>
      </div>
      {type === 'percentage' && (
        <Field label="Adjustment (%)">
          <input
            type="number"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
            className={inputCls}
            placeholder="-10 for 10% off"
            step="0.01"
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="End date">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded"
        />
        Set as default price list
      </label>
    </SlideOver>
  );
}

// ─── Add Price List Item Form ─────────────────────────────────────────────────

function AddPriceListItemForm({
  priceListId,
  products,
  onSaved,
  onCancel,
}: {
  priceListId: string;
  products: Product[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [fixedPrice, setFixedPrice] = useState('');
  const [percentageAdj, setPercentageAdj] = useState('');
  const [minQty, setMinQty] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const variants = selectedProduct?.variants ?? [];

  const handleSave = async () => {
    if (!selectedProductId) {
      setError('Select a product');
      return;
    }
    if (!fixedPrice && !percentageAdj) {
      setError('Enter a fixed price or percentage adjustment');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/catalog/price-lists/${priceListId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProductId,
          variant_id: selectedVariantId || undefined,
          fixed_price: fixedPrice ? parseFloat(fixedPrice) : undefined,
          percentage_adjustment: percentageAdj ? parseFloat(percentageAdj) : undefined,
          min_quantity: parseInt(minQty, 10) || 1,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td colSpan={6} className="px-6 py-4 bg-blue-50/30">
        <p className="text-xs font-semibold text-gray-700 mb-3">Add item</p>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Product *</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSelectedVariantId('');
              }}
              className={selectCls}
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Variant</label>
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className={selectCls}
              disabled={variants.length === 0}
            >
              <option value="">All variants</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku}
                  {v.name ? ` – ${v.name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min qty</label>
            <input
              type="number"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
              className={inputCls}
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fixed price</label>
            <input
              type="number"
              value={fixedPrice}
              onChange={(e) => setFixedPrice(e.target.value)}
              className={inputCls}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Percentage adj. (%)</label>
            <input
              type="number"
              value={percentageAdj}
              onChange={(e) => setPercentageAdj(e.target.value)}
              className={inputCls}
              placeholder="-10 for 10% off"
              step="0.01"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Add item'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Price Resolver Widget ────────────────────────────────────────────────────

function PriceResolver({ products, priceLists }: { products: Product[]; priceLists: PriceList[] }) {
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [priceListId, setPriceListId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [result, setResult] = useState<{ effectivePrice: number; discount?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = products.find((p) => p.id === productId);
  const variants = selectedProduct?.variants ?? [];

  const resolve = async () => {
    if (!productId) {
      setError('Select a product');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await apiFetch<{ effective_price: number; discount_percent?: number }>(
        '/catalog/resolve-price',
        {
          method: 'POST',
          body: JSON.stringify({
            product_id: productId,
            variant_id: variantId || undefined,
            price_list_id: priceListId || undefined,
            quantity: parseInt(quantity, 10) || 1,
          }),
        },
      );
      setResult({
        effectivePrice: data.effective_price,
        ...(data.discount_percent !== undefined && { discount: data.discount_percent }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve price');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Resolver</h3>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Product</label>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setVariantId('');
            }}
            className={selectCls}
          >
            <option value="">Select…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Variant</label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className={selectCls}
            disabled={variants.length === 0}
          >
            <option value="">All</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Price list</label>
          <select
            value={priceListId}
            onChange={(e) => setPriceListId(e.target.value)}
            className={selectCls}
          >
            <option value="">Default</option>
            {priceLists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputCls}
            min="1"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={resolve}
          disabled={loading}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Resolving…' : 'Resolve price'}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {result && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              Effective price: {fmt(result.effectivePrice)}
            </span>
            {result.discount != null && result.discount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                {result.discount.toFixed(1)}% off base
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Price Lists Tab ──────────────────────────────────────────────────────────

function PriceListsTab({ products }: { products: Product[] }) {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, PriceListItem[]>>({});
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const fetchPriceLists = useCallback(async () => {
    try {
      const data = await apiFetch<PriceList[]>('/catalog/price-lists');
      setPriceLists(Array.isArray(data) ? data : []);
    } catch {
      setPriceLists([]);
    }
  }, []);

  useEffect(() => {
    fetchPriceLists();
  }, [fetchPriceLists]);

  const fetchItems = async (plId: string) => {
    try {
      const data = await apiFetch<PriceListItem[]>(`/catalog/price-lists/${plId}/items`);
      setExpandedItems((prev) => ({ ...prev, [plId]: Array.isArray(data) ? data : [] }));
    } catch {
      setExpandedItems((prev) => ({ ...prev, [plId]: [] }));
    }
  };

  const handleExpand = async (plId: string) => {
    if (expandedId === plId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(plId);
    if (!expandedItems[plId]) await fetchItems(plId);
  };

  const handleDeletePriceList = async (id: string) => {
    if (!confirm('Delete this price list?')) return;
    try {
      await apiFetch(`/catalog/price-lists/${id}`, { method: 'DELETE' });
      await fetchPriceLists();
    } catch (err) {
      console.error('Failed to delete price list', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} /> New price list
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {priceLists.length === 0 ? (
          <p className="px-6 py-12 text-sm text-gray-400 text-center">No price lists yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Currency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Adjustment
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Date range
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {priceLists.map((pl) => {
                const isExpanded = expandedId === pl.id;
                const items = expandedItems[pl.id] ?? [];
                return (
                  <>
                    <tr
                      key={pl.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => handleExpand(pl.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{pl.name}</p>
                        {pl.is_default && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${pl.type === 'percentage' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                        >
                          {pl.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{pl.currency}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {pl.type === 'percentage' && pl.adjustment != null
                          ? `${pl.adjustment}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {pl.start_date ? pl.start_date.slice(0, 10) : '∞'} →{' '}
                        {pl.end_date ? pl.end_date.slice(0, 10) : '∞'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[pl.status ?? 'active'] ?? STATUS_BADGE.active}`}
                        >
                          {pl.status ?? 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={14} className="text-gray-400" />
                          )}
                          <button
                            onClick={() => handleDeletePriceList(pl.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <>
                        <tr key={`${pl.id}-items`} className="bg-blue-50/20">
                          <td colSpan={7} className="px-6 py-3">
                            <p className="text-xs font-semibold text-gray-500 mb-2">
                              Items ({items.length})
                            </p>
                            {items.length === 0 ? (
                              <p className="text-xs text-gray-400">No items in this price list.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-blue-100">
                                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">
                                      Product
                                    </th>
                                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">
                                      Variant SKU
                                    </th>
                                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">
                                      Fixed price
                                    </th>
                                    <th className="text-left pb-1.5 text-gray-400 font-medium pr-4">
                                      % adj.
                                    </th>
                                    <th className="text-left pb-1.5 text-gray-400 font-medium">
                                      Min qty
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item) => (
                                    <tr
                                      key={item.id}
                                      className="border-b border-blue-50 last:border-0"
                                    >
                                      <td className="py-1.5 pr-4 text-gray-700">
                                        {item.product_name ?? item.product_id}
                                      </td>
                                      <td className="py-1.5 pr-4 font-mono text-gray-500">
                                        {item.variant_sku ?? '—'}
                                      </td>
                                      <td className="py-1.5 pr-4 text-gray-700">
                                        {item.fixed_price != null ? fmt(item.fixed_price) : '—'}
                                      </td>
                                      <td className="py-1.5 pr-4 text-gray-700">
                                        {item.percentage_adjustment != null
                                          ? `${item.percentage_adjustment}%`
                                          : '—'}
                                      </td>
                                      <td className="py-1.5 text-gray-700">
                                        {item.min_quantity ?? 1}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                        {addingItemTo === pl.id ? (
                          <AddPriceListItemForm
                            key={`${pl.id}-add-item`}
                            priceListId={pl.id}
                            products={products}
                            onSaved={async () => {
                              setAddingItemTo(null);
                              await fetchItems(pl.id);
                            }}
                            onCancel={() => setAddingItemTo(null)}
                          />
                        ) : (
                          <tr key={`${pl.id}-add-btn`} className="bg-blue-50/20">
                            <td colSpan={7} className="px-6 pb-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddingItemTo(pl.id);
                                }}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                <Plus size={12} /> Add item
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <PriceResolver products={products} priceLists={priceLists} />

      {showNew && (
        <NewPriceListForm
          onClose={() => setShowNew(false)}
          onSaved={async () => {
            setShowNew(false);
            await fetchPriceLists();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DISCOUNTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

// ─── New Discount Slide-Over ──────────────────────────────────────────────────

function NewDiscountForm({
  products,
  onClose,
  onSaved,
}: {
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed' | 'bogo'>('percentage');
  const [value, setValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applicableTo, setApplicableTo] = useState<'all' | 'products'>('all');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!value) {
      setError('Value is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch('/catalog/discounts', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase() || undefined,
          type,
          value: parseFloat(value),
          min_order_value: minOrderValue ? parseFloat(minOrderValue) : undefined,
          max_uses: maxUses ? parseInt(maxUses, 10) : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          applicable_to: applicableTo,
          product_ids: applicableTo === 'products' ? productIds : undefined,
          status: 'active',
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create discount');
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (pid: string) =>
    setProductIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));

  return (
    <SlideOver
      title="New Discount"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Create Discount'}
          </button>
        </>
      }
    >
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Field label="Name *">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="e.g. Summer Sale"
        />
      </Field>
      <Field label="Code (optional)">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className={`${inputCls} font-mono`}
          placeholder="SUMMER20"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'percentage' | 'fixed' | 'bogo')}
            className={selectCls}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
            <option value="bogo">BOGO</option>
          </select>
        </Field>
        <Field label="Value">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputCls}
            placeholder={type === 'percentage' ? '10 = 10%' : '0.00'}
            step="0.01"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min order value">
          <input
            type="number"
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(e.target.value)}
            className={inputCls}
            placeholder="0.00"
            step="0.01"
          />
        </Field>
        <Field label="Max uses">
          <input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className={inputCls}
            placeholder="Unlimited"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="End date">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Applicable to">
        <select
          value={applicableTo}
          onChange={(e) => setApplicableTo(e.target.value as 'all' | 'products')}
          className={selectCls}
        >
          <option value="all">All products</option>
          <option value="products">Specific products</option>
        </select>
      </Field>
      {applicableTo === 'products' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Select products</label>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {products.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={productIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="rounded"
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      )}
    </SlideOver>
  );
}

// ─── Validate Code Widget ─────────────────────────────────────────────────────

function ValidateCodeWidget() {
  const [code, setCode] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [result, setResult] = useState<{
    valid: boolean;
    discount_amount?: number;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch<{ valid: boolean; discount_amount?: number; message?: string }>(
        '/catalog/discounts/validate',
        {
          method: 'POST',
          body: JSON.stringify({
            code: code.trim().toUpperCase(),
            order_value: orderValue ? parseFloat(orderValue) : undefined,
          }),
        },
      );
      setResult(data);
    } catch {
      setResult({ valid: false, message: 'Validation failed. Check the code and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Validate Coupon Code</h3>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Coupon code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`${inputCls} font-mono uppercase`}
            placeholder="SUMMER20"
            onKeyDown={(e) => e.key === 'Enter' && validate()}
          />
        </div>
        <div className="w-40">
          <label className="block text-xs text-gray-500 mb-1">Order value</label>
          <input
            type="number"
            value={orderValue}
            onChange={(e) => setOrderValue(e.target.value)}
            className={inputCls}
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <button
          onClick={validate}
          disabled={loading || !code.trim()}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Checking…' : 'Validate'}
        </button>
      </div>

      {result && (
        <div
          className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-lg ${result.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
        >
          {result.valid ? (
            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          ) : (
            <XCircle size={16} className="text-red-500 flex-shrink-0" />
          )}
          <div>
            <p
              className={`text-sm font-medium ${result.valid ? 'text-green-800' : 'text-red-700'}`}
            >
              {result.valid ? 'Valid coupon' : 'Invalid coupon'}
            </p>
            {result.valid && result.discount_amount != null && (
              <p className="text-xs text-green-700 mt-0.5">Saves {fmt(result.discount_amount)}</p>
            )}
            {result.message && <p className="text-xs mt-0.5 text-gray-500">{result.message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Discounts Tab ────────────────────────────────────────────────────────────

const DISCOUNT_TYPE_BADGE: Record<string, string> = {
  percentage: 'bg-violet-100 text-violet-700',
  fixed: 'bg-blue-100 text-blue-700',
  bogo: 'bg-pink-100 text-pink-700',
};

function DiscountsTab({ products }: { products: Product[] }) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchDiscounts = useCallback(async () => {
    try {
      const data = await apiFetch<Discount[]>('/catalog/discounts');
      setDiscounts(Array.isArray(data) ? data : []);
    } catch {
      setDiscounts([]);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this discount?')) return;
    try {
      await apiFetch(`/catalog/discounts/${id}`, { method: 'DELETE' });
      await fetchDiscounts();
    } catch (err) {
      console.error('Failed to delete discount', err);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const formatDiscountValue = (d: Discount) => {
    if (d.type === 'percentage') return `${d.value}%`;
    if (d.type === 'fixed') return fmt(d.value);
    return 'BOGO';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} /> New discount
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {discounts.length === 0 ? (
          <p className="px-6 py-12 text-sm text-gray-400 text-center">No discounts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Min order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Uses</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Date range
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3">
                    {d.code ? (
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {d.code}
                        </code>
                        <button
                          onClick={() => copyCode(d.code!)}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                          title="Copy code"
                        >
                          {copied === d.code ? (
                            <CheckCircle size={12} className="text-green-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DISCOUNT_TYPE_BADGE[d.type] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {d.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{formatDiscountValue(d)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {d.min_order_value ? fmt(d.min_order_value) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {d.used_count ?? 0}
                    {d.max_uses ? `/${d.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {d.start_date ? d.start_date.slice(0, 10) : '∞'} →{' '}
                    {d.end_date ? d.end_date.slice(0, 10) : '∞'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[d.status ?? 'active'] ?? STATUS_BADGE.active}`}
                    >
                      {d.status ?? 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ValidateCodeWidget />

      {showNew && (
        <NewDiscountForm
          products={products}
          onClose={() => setShowNew(false)}
          onSaved={async () => {
            setShowNew(false);
            await fetchDiscounts();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CatalogClient({ initialProducts }: { initialProducts: Product[] }) {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>(initialProducts);

  // Keep products up-to-date for cross-tab widgets
  const refreshProducts = useCallback(async () => {
    try {
      const data = await apiFetch<Product[]>('/catalog/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      // keep existing
    }
  }, []);

  // Refresh products whenever tab switches to price lists or discounts
  useEffect(() => {
    if (tab !== 'products') refreshProducts();
  }, [tab, refreshProducts]);

  return (
    <div className="px-8 py-8 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Product Catalog</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage products, price lists, and discounts</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'products' && <ProductsTab initialProducts={products} />}
      {tab === 'pricelists' && <PriceListsTab products={products} />}
      {tab === 'discounts' && <DiscountsTab products={products} />}
    </div>
  );
}
