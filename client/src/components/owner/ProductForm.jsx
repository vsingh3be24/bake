import { useRef, useState } from 'react';
import { ImagePlus, X, Plus, Trash2 } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Input } from '../ui/Input.jsx';
import { Select } from '../ui/Select.jsx';
import { Switch } from '../ui/Switch.jsx';
import { Button } from '../ui/Button.jsx';

const TAGS = [
  { id: 'eggless', label: 'Eggless' },
  { id: 'sugar-free', label: 'Sugar-Free' },
  { id: 'high-protein', label: 'High Protein' },
];

const EMPTY = {
  name: '',
  category: '',
  shortDesc: '',
  longDesc: '',
  images: [],
  hasVariants: false,
  variants: [],
  price: '',
  salePrice: '',
  unit: 'per piece',
  stockMode: 'unlimited',
  stockCount: 0,
  dailyCapacity: 0,
  lowStockThreshold: 5,
  minQty: 4,
  maxQty: 50,
  stepQty: 1,
  prepTimeHours: 24,
  tags: [],
  allergens: '',
  isHotSelling: false,
  isVisible: true,
};

export function ProductForm({ initial, onSubmit, onCancel, submitting }) {
  const { categories } = useCategories();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const [data, setData] = useState(() => ({
    ...EMPTY,
    ...(initial || {}),
    category: initial?.category?._id || initial?.category || '',
    price: initial?.price ?? '',
    salePrice: initial?.salePrice ?? '',
    allergens: (initial?.allergens || []).join(', '),
    variants: initial?.variants || [],
  }));
  const [errors, setErrors] = useState({});

  const set = (field) => (value) => setData((d) => ({ ...d, [field]: value }));
  const onInput = (field) => (e) => set(field)(e.target.value);

  const toggleTag = (id) => {
    setData((d) => {
      const has = d.tags.includes(id);
      return { ...d, tags: has ? d.tags.filter((t) => t !== id) : [...d.tags, id] };
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data: res } = await api.post('/owner/products/upload-image', form);
      setData((d) => ({ ...d, images: [...d.images, res.url] }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload the image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (i) => setData((d) => ({ ...d, images: d.images.filter((_, idx) => idx !== i) }));

  const addVariant = () =>
    setData((d) => ({ ...d, variants: [...d.variants, { label: '', price: '', salePrice: '', stockCount: 0 }] }));
  const updateVariant = (i, field, value) =>
    setData((d) => ({
      ...d,
      variants: d.variants.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)),
    }));
  const removeVariant = (i) => setData((d) => ({ ...d, variants: d.variants.filter((_, idx) => idx !== i) }));

  const validate = () => {
    const e = {};
    if (!data.name.trim()) e.name = 'Please name the product';
    if (!data.category) e.category = 'Please choose a category';
    if (!data.hasVariants && data.price === '') e.price = 'Please set a price';
    if (data.hasVariants && data.variants.length === 0) e.variants = 'Add at least one variant';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const payload = {
      ...data,
      price: data.hasVariants ? undefined : Number(data.price) || 0,
      salePrice: data.salePrice === '' ? null : Number(data.salePrice),
      stockCount: Number(data.stockCount) || 0,
      dailyCapacity: Number(data.dailyCapacity) || 0,
      lowStockThreshold: Number(data.lowStockThreshold) || 0,
      minQty: Number(data.minQty) || 1,
      maxQty: Number(data.maxQty) || 1,
      stepQty: Number(data.stepQty) || 1,
      prepTimeHours: Number(data.prepTimeHours) || 0,
      allergens: data.allergens
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      variants: data.hasVariants
        ? data.variants.map((v) => ({
            label: v.label,
            price: Number(v.price) || 0,
            salePrice: v.salePrice === '' ? null : Number(v.salePrice),
            stockCount: Number(v.stockCount) || 0,
          }))
        : [],
    };
    onSubmit(payload);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Name" required value={data.name} onChange={onInput('name')} error={errors.name} placeholder="Mawa Cake" />
        <Select label="Category" required value={data.category} onChange={onInput('category')} error={errors.category}>
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </Select>
      </div>

      <Input label="Short Description" value={data.shortDesc} onChange={onInput('shortDesc')} maxLength={90} placeholder="Traditional, rich, khoya + nuts + cardamom" />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-brown">Full Description</label>
        <textarea
          value={data.longDesc}
          onChange={onInput('longDesc')}
          rows={3}
          className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-3.5 py-2.5 text-base text-brown focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)]"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-brown">Photos</p>
        <div className="flex flex-wrap gap-3">
          {data.images.map((url, i) => (
            <div key={i} className="relative h-20 w-20 shrink-0">
              <img src={url} alt="" className="h-full w-full rounded-md border border-[rgba(169,141,116,0.25)] object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-pill bg-out-stock text-cream"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[rgba(169,141,116,0.4)] text-brown-mute hover:border-maroon hover:text-maroon disabled:opacity-50"
          >
            <ImagePlus size={18} strokeWidth={1.75} />
            <span className="text-[10px]">{uploading ? 'Uploading…' : 'Add'}</span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>

      <div className="rounded-md border border-[rgba(169,141,116,0.25)] p-4">
        <Switch checked={data.hasVariants} onChange={set('hasVariants')} label="This product has variants (e.g. sizes)" />

        {data.hasVariants ? (
          <div className="mt-4 flex flex-col gap-3">
            {data.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <Input label="Label" value={v.label} onChange={(e) => updateVariant(i, 'label', e.target.value)} placeholder="500g" />
                <Input label="Price (₹)" type="number" min={0} value={v.price} onChange={(e) => updateVariant(i, 'price', e.target.value)} />
                <Input label="Sale Price (₹)" type="number" min={0} value={v.salePrice} onChange={(e) => updateVariant(i, 'salePrice', e.target.value)} placeholder="Optional" />
                <Input label="Stock" type="number" min={0} value={v.stockCount} onChange={(e) => updateVariant(i, 'stockCount', e.target.value)} />
                <Button variant="ghost" size="sm" onClick={() => removeVariant(i)}>
                  <Trash2 size={14} strokeWidth={1.75} />
                </Button>
              </div>
            ))}
            {errors.variants && <p className="text-sm text-out-stock">{errors.variants}</p>}
            <Button variant="secondary" size="sm" className="w-fit" onClick={addVariant}>
              <Plus size={14} strokeWidth={1.75} /> Add Variant
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Price (₹)" required type="number" min={0} value={data.price} onChange={onInput('price')} error={errors.price} />
            <Input label="Sale Price (₹)" type="number" min={0} value={data.salePrice} onChange={onInput('salePrice')} placeholder="Optional" />
            <Input label="Unit" value={data.unit} onChange={onInput('unit')} placeholder="per piece" />
          </div>
        )}
      </div>

      <div className="rounded-md border border-[rgba(169,141,116,0.25)] p-4">
        <p className="mb-3 text-sm font-medium text-brown">Stock</p>
        <Select label="Stock Mode" value={data.stockMode} onChange={onInput('stockMode')} className="max-w-xs">
          <option value="unlimited">Unlimited</option>
          <option value="counted">Counted</option>
          <option value="daily_capacity">Daily Capacity</option>
        </Select>
        {data.stockMode === 'counted' && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-md">
            <Input label="Stock Count" type="number" min={0} value={data.stockCount} onChange={onInput('stockCount')} />
            <Input label="Low Stock Alert At" type="number" min={0} value={data.lowStockThreshold} onChange={onInput('lowStockThreshold')} />
          </div>
        )}
        {data.stockMode === 'daily_capacity' && (
          <div className="mt-3 max-w-xs">
            <Input label="Daily Capacity" type="number" min={0} value={data.dailyCapacity} onChange={onInput('dailyCapacity')} />
          </div>
        )}
      </div>

      <div className="rounded-md border border-[rgba(169,141,116,0.25)] p-4">
        <p className="mb-3 text-sm font-medium text-brown">Order Rules</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Min Qty" type="number" min={1} value={data.minQty} onChange={onInput('minQty')} />
          <Input label="Max Qty" type="number" min={1} value={data.maxQty} onChange={onInput('maxQty')} />
          <Input label="Prep Time (hrs)" type="number" min={0} value={data.prepTimeHours} onChange={onInput('prepTimeHours')} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-brown">Tags</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className={[
                'rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors',
                data.tags.includes(t.id) ? 'border-maroon bg-maroon text-cream' : 'border-[rgba(169,141,116,0.35)] text-brown-soft hover:border-maroon',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Input label="Allergens (comma-separated)" value={data.allergens} onChange={onInput('allergens')} placeholder="nuts, dairy" />

      <div className="flex flex-col gap-2">
        <Switch checked={data.isHotSelling} onChange={set('isHotSelling')} label="🔥 Show in Hot Selling" />
        <Switch checked={data.isVisible} onChange={set('isVisible')} label="Visible on the menu" />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button loading={submitting} onClick={submit}>{initial ? 'Save Changes' : 'Add Product'}</Button>
      </div>
    </div>
  );
}
