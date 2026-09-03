import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAvailability } from '../../hooks/useAvailability.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDayParts } from '../../lib/availability.js';
import { formatRupees } from '../../lib/format.js';
import { Modal } from '../ui/Modal.jsx';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { AddressForm } from '../checkout/AddressForm.jsx';
import { DatePicker } from '../checkout/DatePicker.jsx';
import { SlotPicker } from '../checkout/SlotPicker.jsx';

const PHONE_RE = /^[6-9]\d{9}$/;

export function ManualOrderModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const { settings } = useSettings();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [items, setItems] = useState([]); // [{productId, name, price, salePrice, minQty, maxQty, stepQty, qty}]

  const [deliveryType, setDeliveryType] = useState('delivery');
  const [contact, setContact] = useState({ name: '', phone: '', line1: '', landmark: '', area: '', pincode: '' });
  const [errors, setErrors] = useState({});
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [specialNote, setSpecialNote] = useState('');
  const [placing, setPlacing] = useState(false);

  const availabilityItems = useMemo(() => items.map((i) => ({ productId: i.productId, qty: i.qty })), [items]);
  const { days, earliest, loading: availLoading, error: availError } = useAvailability(availabilityItems);

  useEffect(() => {
    if (!date && earliest) setDate(formatDayParts(earliest).key);
  }, [earliest, date]);

  // Reset on close so re-opening starts fresh.
  useEffect(() => {
    if (!open) {
      setSearch('');
      setResults([]);
      setItems([]);
      setDeliveryType('delivery');
      setContact({ name: '', phone: '', line1: '', landmark: '', area: '', pincode: '' });
      setErrors({});
      setDate(null);
      setSlot(null);
      setPaymentMethod('COD');
      setSpecialNote('');
    }
  }, [open]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get('/products', { params: { search: search.trim(), inStock: 'true' } })
        .then(({ data }) => setResults(data.products || []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const selectedDay = days.find((d) => formatDayParts(d.date).key === date);

  const addItem = (product) => {
    if (items.some((i) => i.productId === product._id)) {
      toast.info('Already added — adjust the quantity instead');
      return;
    }
    setItems((s) => [
      ...s,
      {
        productId: product._id,
        name: product.name,
        price: product.price,
        salePrice: product.salePrice,
        minQty: product.minQty || 1,
        maxQty: product.maxQty || 99,
        stepQty: product.stepQty || 1,
        qty: product.minQty || 1,
      },
    ]);
    setSearch('');
    setResults([]);
  };

  const changeQty = (productId, delta) => {
    setItems((s) =>
      s.map((i) => {
        if (i.productId !== productId) return i;
        const next = i.qty + delta * i.stepQty;
        return { ...i, qty: Math.max(i.minQty, Math.min(i.maxQty, next)) };
      })
    );
  };

  const removeItem = (productId) => setItems((s) => s.filter((i) => i.productId !== productId));

  const itemsTotal = items.reduce((sum, i) => sum + (i.salePrice ?? i.price) * i.qty, 0);

  const validate = () => {
    const e = {};
    if (items.length === 0) {
      toast.error('Add at least one item');
      return false;
    }
    if (!contact.name.trim()) e.name = 'Please enter a name';
    if (!PHONE_RE.test(contact.phone.trim())) e.phone = 'Please enter a valid 10-digit number';
    if (deliveryType === 'delivery') {
      if (!contact.line1.trim()) e.line1 = 'Please enter an address';
      if (!contact.area.trim()) e.area = 'Please enter an area';
      if (!/^\d{6}$/.test(contact.pincode.trim())) e.pincode = 'Please enter a 6-digit pincode';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return false;
    if (!date) {
      toast.error('Please choose a delivery date');
      return false;
    }
    if (!slot) {
      toast.error('Please choose a delivery slot');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setPlacing(true);
    try {
      const { data } = await api.post('/owner/orders/manual', {
        contact: { name: contact.name.trim(), phone: contact.phone.trim() },
        address:
          deliveryType === 'delivery'
            ? { line1: contact.line1, landmark: contact.landmark, area: contact.area, pincode: contact.pincode }
            : undefined,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        deliveryDate: date,
        deliverySlot: slot,
        deliveryType,
        paymentMethod,
        specialNote,
      });
      toast.success(`Order ${data.orderId} created`);
      onCreated?.(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create the order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manual Order"
      footer={
        <div className="flex items-center justify-between">
          <span className="font-semibold text-brown">{formatRupees(itemsTotal)}</span>
          <Button loading={placing} loadingText="Creating..." onClick={submit}>
            Create Order
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <label className="text-sm font-medium text-brown">Items</label>
          <div className="relative mt-1.5">
            <Search size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-mute" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper py-2.5 pl-9 pr-3.5 text-sm text-brown focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)]"
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-[rgba(169,141,116,0.25)] bg-paper shadow-md">
                {results.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => addItem(p)}
                    className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm text-brown hover:bg-cream-deep"
                  >
                    <span>{p.name}</span>
                    <span className="text-brown-mute">{formatRupees(p.salePrice ?? p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {items.map((i) => (
                <div key={i.productId} className="flex items-center justify-between gap-2 rounded-md bg-cream-deep px-3 py-2 text-sm">
                  <span className="flex-1 text-brown">{i.name}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeQty(i.productId, -1)} className="text-brown-soft">
                      <Minus size={14} strokeWidth={1.75} />
                    </button>
                    <span className="w-6 text-center tabular-nums text-brown">{i.qty}</span>
                    <button type="button" onClick={() => changeQty(i.productId, 1)} className="text-brown-soft">
                      <Plus size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                  <span className="w-16 text-right tabular-nums text-brown">
                    {formatRupees((i.salePrice ?? i.price) * i.qty)}
                  </span>
                  <button type="button" onClick={() => removeItem(i.productId)} className="text-brown-mute">
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {['delivery', 'pickup'].map((t) => {
            if (t === 'pickup' && settings?.allowPickup === false) return null;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setDeliveryType(t)}
                className={[
                  'rounded-pill border px-4 py-2 text-sm font-medium capitalize transition-colors',
                  deliveryType === t
                    ? 'border-maroon bg-maroon text-cream'
                    : 'border-[rgba(169,141,116,0.35)] text-brown-soft hover:border-maroon',
                ].join(' ')}
              >
                {t}
              </button>
            );
          })}
        </div>

        <AddressForm value={contact} errors={errors} onChange={setContact} deliveryType={deliveryType} />

        <div>
          <h3 className="mb-2 text-sm font-medium text-brown">Delivery Date</h3>
          <DatePicker
            days={days}
            loading={availLoading}
            error={availError}
            selected={date}
            onSelect={(k) => {
              setDate(k);
              setSlot(null);
            }}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-brown">Delivery Slot</h3>
          <SlotPicker slots={selectedDay?.slots || []} selected={slot} onSelect={setSlot} />
        </div>

        <div className="flex gap-2">
          {['COD', 'UPI'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMethod(m)}
              className={[
                'rounded-pill border px-4 py-2 text-sm font-medium transition-colors',
                paymentMethod === m
                  ? 'border-maroon bg-maroon text-cream'
                  : 'border-[rgba(169,141,116,0.35)] text-brown-soft hover:border-maroon',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>

        <Input
          label="Special Note"
          value={specialNote}
          onChange={(e) => setSpecialNote(e.target.value)}
          placeholder="Less sweet, etc."
        />
      </div>
    </Modal>
  );
}
