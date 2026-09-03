import { useEffect, useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories.js';
import { useProducts } from '../../hooks/useProducts.js';
import { Input } from '../ui/Input.jsx';
import { Select } from '../ui/Select.jsx';
import { Switch } from '../ui/Switch.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';

const TYPE_LABEL = {
  percent: 'Percent Off',
  flat: 'Flat Amount Off',
  bogo: 'Buy X Get Y Free',
  combo: 'Combo Discount',
  free_delivery: 'Free Delivery',
  free_item: 'Free Item',
  bundle_price: 'Bundle Price',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY = {
  title: '',
  subtitle: '',
  code: '',
  isAutoApply: true,
  type: 'percent',
  value: 10,
  maxDiscount: '',
  minOrderValue: 0,
  appliesTo: 'all',
  targetIds: [],
  freeItemId: '',
  bundleProducts: [],
  bundlePrice: '',
  isFlash: false,
  startAt: '',
  endAt: '',
  flashBannerText: '',
  showCountdown: true,
  isRecurring: false,
  recurDays: [],
  recurStartTime: '09:00',
  recurEndTime: '13:00',
  usageLimit: '',
  perCustomerLimit: 1,
  firstOrderOnly: false,
  isStackable: false,
  priority: 0,
  showOnHomepage: true,
  badgeText: '',
  isActive: true,
};

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TEMPLATES = {
  weekend10: {
    title: 'Weekend 10%', subtitle: 'Weekend mornings only', type: 'percent', value: 10, maxDiscount: 150,
    minOrderValue: 299, appliesTo: 'all', isAutoApply: true, isRecurring: true, recurDays: [0, 6],
    recurStartTime: '09:00', recurEndTime: '13:00', isFlash: true, showCountdown: true,
    flashBannerText: '⚡ Weekend Flash — 10% OFF', badgeText: '10% OFF',
  },
  freeDeliveryDay: {
    title: 'Free Delivery Day', subtitle: 'No delivery charge, all day', type: 'free_delivery',
    minOrderValue: 0, appliesTo: 'cart_total', isAutoApply: true, badgeText: 'FREE Delivery',
  },
  buy4Get1: {
    title: 'Buy 4 Get 1', subtitle: 'Mix and match', type: 'bogo', value: 1, appliesTo: 'category',
    isAutoApply: true, badgeText: 'Buy 4 Get 1',
  },
  festival20: {
    title: 'Festival 20%', subtitle: 'Limited-time festival special', type: 'percent', value: 20,
    maxDiscount: 200, minOrderValue: 399, appliesTo: 'all', isAutoApply: true, isFlash: true,
    showCountdown: true, flashBannerText: '⚡ Festival Special — 20% OFF', badgeText: '20% OFF',
  },
  clearStock30: {
    title: 'Clear Stock 30%', subtitle: 'While stock lasts', type: 'percent', value: 30, maxDiscount: 300,
    appliesTo: 'all', isAutoApply: true, isFlash: true, showCountdown: true,
    flashBannerText: '⚡ Clearance — 30% OFF', badgeText: '30% OFF',
  },
};

export function OfferForm({ initial, onSubmit, onCancel, submitting }) {
  const { categories } = useCategories();
  const { products } = useProducts({ page: 1 });

  const [data, setData] = useState(() => ({
    ...EMPTY,
    ...(initial || {}),
    code: initial?.code || '',
    maxDiscount: initial?.maxDiscount ?? '',
    bundlePrice: initial?.bundlePrice ?? '',
    usageLimit: initial?.usageLimit ?? '',
    freeItemId: initial?.freeItemId || '',
    startAt: toLocalInput(initial?.startAt),
    endAt: toLocalInput(initial?.endAt),
    targetIds: (initial?.targetIds || []).map(String),
    bundleProducts: (initial?.bundleProducts || []).map(String),
  }));
  const [errors, setErrors] = useState({});

  const set = (field) => (value) => setData((d) => ({ ...d, [field]: value }));
  const onInput = (field) => (e) => set(field)(e.target.value);
  const onCheck = (field) => (e) => set(field)(e.target.checked);

  const applyTemplate = (key) => {
    setData((d) => ({ ...EMPTY, ...d, ...TEMPLATES[key], targetIds: [], bundleProducts: [] }));
  };

  const toggleTarget = (id) => {
    setData((d) => {
      const has = d.targetIds.includes(id);
      return { ...d, targetIds: has ? d.targetIds.filter((t) => t !== id) : [...d.targetIds, id] };
    });
  };
  const toggleBundleProduct = (id) => {
    setData((d) => {
      const has = d.bundleProducts.includes(id);
      return { ...d, bundleProducts: has ? d.bundleProducts.filter((t) => t !== id) : [...d.bundleProducts, id] };
    });
  };
  const toggleRecurDay = (day) => {
    setData((d) => {
      const has = d.recurDays.includes(day);
      return { ...d, recurDays: has ? d.recurDays.filter((t) => t !== day) : [...d.recurDays, day].sort() };
    });
  };

  const needsTargets = ['category', 'product'].includes(data.appliesTo) && ['percent', 'flat', 'bogo', 'combo'].includes(data.type);
  const targetOptions =
    data.appliesTo === 'category' ? categories.map((c) => ({ id: c._id, label: c.name })) : products.map((p) => ({ id: p._id, label: p.name }));

  const validate = () => {
    const e = {};
    if (!data.title.trim()) e.title = 'Please give the offer a title';
    if (data.type === 'combo' && data.targetIds.length < 2) e.targetIds = 'Combo needs at least 2 targets';
    if (needsTargets && data.type !== 'combo' && data.targetIds.length === 0) e.targetIds = 'Please pick at least one';
    if (data.type === 'free_item' && !data.freeItemId) e.freeItemId = 'Please choose the free item';
    if (data.type === 'bundle_price' && data.bundleProducts.length < 2) e.bundleProducts = 'Pick at least 2 products';
    if (data.type === 'bundle_price' && !data.bundlePrice) e.bundlePrice = 'Please set the bundle price';
    if (data.isFlash && data.startAt && data.endAt && new Date(data.endAt) <= new Date(data.startAt)) {
      e.endAt = 'End must be after start';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const payload = {
      ...data,
      value: Number(data.value) || 0,
      maxDiscount: data.maxDiscount === '' ? null : Number(data.maxDiscount),
      minOrderValue: Number(data.minOrderValue) || 0,
      bundlePrice: data.bundlePrice === '' ? null : Number(data.bundlePrice),
      usageLimit: data.usageLimit === '' ? null : Number(data.usageLimit),
      perCustomerLimit: Number(data.perCustomerLimit) || 0,
      priority: Number(data.priority) || 0,
      startAt: data.isFlash && data.startAt ? new Date(data.startAt).toISOString() : null,
      endAt: data.isFlash && data.endAt ? new Date(data.endAt).toISOString() : null,
      freeItemId: data.type === 'free_item' ? data.freeItemId : null,
    };
    onSubmit(payload);
  };

  return (
    <div className="flex flex-col gap-6">
      {!initial && (
        <div>
          <p className="mb-2 text-sm font-medium text-brown">One-click templates</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries({
              weekend10: 'Weekend 10%', freeDeliveryDay: 'Free Delivery Day', buy4Get1: 'Buy 4 Get 1',
              festival20: 'Festival 20%', clearStock30: 'Clear Stock 30%',
            }).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="rounded-pill border border-[rgba(169,141,116,0.35)] px-3 py-1.5 text-xs font-medium text-brown-soft hover:border-maroon hover:text-maroon"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Title" required value={data.title} onChange={onInput('title')} error={errors.title} placeholder="Rakhi Special — 20% Off" />
        <Input label="Subtitle" value={data.subtitle} onChange={onInput('subtitle')} placeholder="Sab hampers pe" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select label="Offer Type" value={data.type} onChange={onInput('type')}>
          {Object.entries(TYPE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>

        {['percent', 'flat', 'bogo', 'combo'].includes(data.type) && (
          <Input
            label={data.type === 'percent' || data.type === 'combo' ? 'Value (%)' : data.type === 'flat' ? 'Value (₹)' : 'Free units per group'}
            type="number" min={0} value={data.value} onChange={onInput('value')}
          />
        )}
        {data.type === 'percent' && (
          <Input label="Max Discount (₹)" type="number" min={0} value={data.maxDiscount} onChange={onInput('maxDiscount')} placeholder="No cap" />
        )}
      </div>

      <Input label="Minimum Order (₹)" type="number" min={0} value={data.minOrderValue} onChange={onInput('minOrderValue')} className="max-w-[200px]" />

      {['percent', 'flat', 'bogo', 'combo'].includes(data.type) && (
        <div>
          <p className="mb-2 text-sm font-medium text-brown">Applies to</p>
          <div className="flex gap-2">
            {['all', 'category', 'product'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set('appliesTo')(opt)}
                className={[
                  'rounded-pill border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors',
                  data.appliesTo === opt ? 'border-maroon bg-maroon text-cream' : 'border-[rgba(169,141,116,0.35)] text-brown-soft hover:border-maroon',
                ].join(' ')}
              >
                {opt === 'all' ? 'Everything' : opt}
              </button>
            ))}
          </div>
          {needsTargets && (
            <div className="mt-3">
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-[rgba(169,141,116,0.25)] p-3">
                {targetOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleTarget(opt.id)}
                    className={[
                      'rounded-pill border px-3 py-1 text-xs font-medium transition-colors',
                      data.targetIds.includes(opt.id) ? 'border-maroon bg-maroon text-cream' : 'border-[rgba(169,141,116,0.3)] text-brown-soft',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.targetIds && <p className="mt-1 text-sm text-out-stock">{errors.targetIds}</p>}
            </div>
          )}
        </div>
      )}

      {data.type === 'free_item' && (
        <div>
          <p className="mb-2 text-sm font-medium text-brown">Free item</p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-[rgba(169,141,116,0.25)] p-3">
            {products.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => set('freeItemId')(p._id)}
                className={[
                  'rounded-pill border px-3 py-1 text-xs font-medium transition-colors',
                  data.freeItemId === p._id ? 'border-maroon bg-maroon text-cream' : 'border-[rgba(169,141,116,0.3)] text-brown-soft',
                ].join(' ')}
              >
                {p.name}
              </button>
            ))}
          </div>
          {errors.freeItemId && <p className="mt-1 text-sm text-out-stock">{errors.freeItemId}</p>}
        </div>
      )}

      {data.type === 'bundle_price' && (
        <div>
          <p className="mb-2 text-sm font-medium text-brown">Bundle products</p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-[rgba(169,141,116,0.25)] p-3">
            {products.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => toggleBundleProduct(p._id)}
                className={[
                  'rounded-pill border px-3 py-1 text-xs font-medium transition-colors',
                  data.bundleProducts.includes(p._id) ? 'border-maroon bg-maroon text-cream' : 'border-[rgba(169,141,116,0.3)] text-brown-soft',
                ].join(' ')}
              >
                {p.name}
              </button>
            ))}
          </div>
          {errors.bundleProducts && <p className="mt-1 text-sm text-out-stock">{errors.bundleProducts}</p>}
          <Input label="Bundle Price (₹)" type="number" min={0} value={data.bundlePrice} onChange={onInput('bundlePrice')} error={errors.bundlePrice} className="mt-3 max-w-[200px]" />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Input label="Code (optional)" value={data.code} onChange={(e) => set('code')(e.target.value.toUpperCase())} placeholder="RAKHI20" className="max-w-[200px]" />
        <Switch checked={data.isAutoApply} onChange={set('isAutoApply')} label="Auto-apply (no code needed)" />
      </div>

      <div className="rounded-md border border-[rgba(169,141,116,0.25)] p-4">
        <Switch checked={data.isFlash} onChange={set('isFlash')} label="⚡ Make it a flash offer" />
        {data.isFlash && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Start" type="datetime-local" value={data.startAt} onChange={onInput('startAt')} />
              <Input label="End" type="datetime-local" value={data.endAt} onChange={onInput('endAt')} error={errors.endAt} />
            </div>
            <Switch checked={data.showCountdown} onChange={set('showCountdown')} label="Show countdown timer" />
            <Input label="Banner Text" value={data.flashBannerText} onChange={onInput('flashBannerText')} placeholder="⚡ 4 hours left — 20% OFF hampers!" />

            <div className="border-t border-[rgba(169,141,116,0.2)] pt-4">
              <Switch checked={data.isRecurring} onChange={set('isRecurring')} label="Repeat weekly" />
              {data.isRecurring && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleRecurDay(i)}
                        className={[
                          'h-8 w-8 rounded-pill text-xs font-medium transition-colors',
                          data.recurDays.includes(i) ? 'bg-maroon text-cream' : 'bg-cream-deep text-brown-soft',
                        ].join(' ')}
                      >
                        {label[0]}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-xs">
                    <Input label="From" type="time" value={data.recurStartTime} onChange={onInput('recurStartTime')} />
                    <Input label="To" type="time" value={data.recurEndTime} onChange={onInput('recurEndTime')} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-[rgba(169,141,116,0.25)] p-4">
        <p className="mb-3 text-sm font-medium text-brown">Limits</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Total uses" type="number" min={0} value={data.usageLimit} onChange={onInput('usageLimit')} placeholder="Unlimited" />
          <Input label="Per customer" type="number" min={0} value={data.perCustomerLimit} onChange={onInput('perCustomerLimit')} />
          <Input label="Priority" type="number" value={data.priority} onChange={onInput('priority')} helperText="Higher wins a clash" />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Switch checked={data.firstOrderOnly} onChange={set('firstOrderOnly')} label="First-time customers only" />
          <Switch checked={data.isStackable} onChange={set('isStackable')} label="Can stack with other offers" />
          <Switch checked={data.showOnHomepage} onChange={set('showOnHomepage')} label="Show on homepage" />
        </div>
      </div>

      <Input label="Badge Text (shown on product cards)" value={data.badgeText} onChange={onInput('badgeText')} placeholder="20% OFF" className="max-w-xs" />

      <OfferPreview data={data} />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button loading={submitting} onClick={submit}>{initial ? 'Save Changes' : 'Launch Offer'}</Button>
      </div>
    </div>
  );
}

function OfferPreview({ data }) {
  return (
    <div className="rounded-md bg-cream-deep p-4">
      <p className="mb-3 text-sm font-medium text-brown">Preview</p>
      {data.isFlash && (data.flashBannerText || data.title) && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-sm bg-crimson px-3 py-2 text-center text-xs font-medium text-cream">
          <Zap size={13} strokeWidth={2} />
          {data.flashBannerText || data.title}
          {data.showCountdown && <span className="tabular-nums font-semibold">— 01:59:59</span>}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-3">
        <div className="h-12 w-12 shrink-0 rounded-sm bg-cream-deep" />
        <div className="flex-1">
          <p className="text-sm font-medium text-brown">{data.title || 'Offer title'}</p>
          {data.subtitle && <p className="text-xs text-brown-mute">{data.subtitle}</p>}
        </div>
        {data.badgeText && <Badge variant="sale">{data.badgeText}</Badge>}
      </div>
    </div>
  );
}
