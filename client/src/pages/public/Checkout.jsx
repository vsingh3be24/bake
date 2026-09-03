import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ChevronLeft } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useCartStore } from '../../store/cartStore.js';
import { useCartValidation } from '../../hooks/useCartValidation.js';
import { useOfferPreview } from '../../hooks/useOfferPreview.js';
import { useAvailability } from '../../hooks/useAvailability.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDayParts } from '../../lib/availability.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { DatePicker } from '../../components/checkout/DatePicker.jsx';
import { SlotPicker } from '../../components/checkout/SlotPicker.jsx';
import { AddressForm } from '../../components/checkout/AddressForm.jsx';
import { PaymentSelect } from '../../components/checkout/PaymentSelect.jsx';
import { OrderSummary } from '../../components/checkout/OrderSummary.jsx';

const STEPS = ['Delivery', 'Payment', 'Review'];
const PHONE_RE = /^[6-9]\d{9}$/;

function Stepper({ current }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-sm font-semibold',
                done || active ? 'bg-maroon text-cream' : 'bg-cream-deep text-brown-mute',
              ].join(' ')}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${active ? 'font-medium text-brown' : 'text-brown-mute'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-[rgba(169,141,116,0.3)]" />}
          </div>
        );
      })}
    </div>
  );
}

export function Checkout() {
  const navigate = useNavigate();
  const toast = useToast();
  const items = useCartStore((s) => s.items);
  const offerCode = useCartStore((s) => s.offerCode);
  const clearCart = useCartStore((s) => s.clear);

  const { result, loading: cartLoading } = useCartValidation();
  const { settings } = useSettings();
  const availabilityItems = useMemo(
    () => items.map((i) => ({ productId: i.productId, qty: i.qty })),
    [items]
  );
  const { days, earliest, loading: availLoading, error: availError } = useAvailability(availabilityItems);

  const [step, setStep] = useState(0);
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [contact, setContact] = useState({ name: '', phone: '', line1: '', landmark: '', area: '', pincode: '' });
  const [errors, setErrors] = useState({});
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [specialNote, setSpecialNote] = useState('');
  const [cakeMessage, setCakeMessage] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [utr, setUtr] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!date && earliest) setDate(formatDayParts(earliest).key);
  }, [earliest, date]);

  const selectedDay = days.find((d) => formatDayParts(d.date).key === date);

  const validLines = result?.items?.filter((l) => l.valid) || [];
  const itemsTotal = result?.itemsTotal || 0;

  // Offers, stacked, from the same engine that will charge the card. Phone is
  // only sent once it's a valid number, so first-order/per-customer gating is
  // accurate without re-previewing on every keystroke.
  const previewPhone = PHONE_RE.test(contact.phone.trim()) ? contact.phone.trim() : null;
  const preview = useOfferPreview({ items, code: offerCode, phone: previewPhone, deliveryType });
  const offerDiscount = preview.totalDiscount || 0;

  // Display-only maths; the server recomputes every rupee on submit.
  const packagingCharge = result?.packagingCharge || 0;
  const deliveryCharge = deliveryType === 'pickup' ? 0 : preview.freeDelivery ? 0 : result?.deliveryCharge ?? 0;
  const grandTotal = Math.max(itemsTotal - offerDiscount, 0) + deliveryCharge + packagingCharge;

  const validateStep1 = () => {
    const e = {};
    if (!contact.name.trim()) e.name = 'Please enter your name';
    if (!PHONE_RE.test(contact.phone.trim())) e.phone = 'Please enter a valid 10-digit number';
    if (deliveryType === 'delivery') {
      if (!contact.line1.trim()) e.line1 = 'Please enter an address';
      if (!contact.area.trim()) e.area = 'Please enter an area';
      if (!/^\d{6}$/.test(contact.pincode.trim())) e.pincode = 'Please enter a 6-digit pincode';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return false;
    if (!date) { toast.error('Please choose a delivery date'); return false; }
    if (!slot) { toast.error('Please choose a delivery slot'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (paymentMethod === 'UPI' && utr.trim() && !/^\d{12}$/.test(utr.trim())) {
      setErrors({ utr: 'The UTR should be 12 digits' });
      return false;
    }
    setErrors({});
    return true;
  };

  const next = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        contact: { name: contact.name, phone: contact.phone },
        address:
          deliveryType === 'delivery'
            ? { line1: contact.line1, landmark: contact.landmark, area: contact.area, pincode: contact.pincode }
            : undefined,
        items: items.map((i) => ({ productId: i.productId, variantLabel: i.variantLabel, qty: i.qty })),
        deliveryDate: date,
        deliverySlot: slot,
        deliveryType,
        paymentMethod,
        upiRefNumber: utr.trim() || undefined,
        paymentScreenshot: screenshotUrl || undefined,
        offerCode: offerCode || undefined,
        specialNote,
        cakeMessage,
        isGift,
      });
      clearCart();
      navigate(`/order-success/${data.orderId}`, { state: data });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not place your order — please try again');
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-lhh py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Add something first"
          actionLabel="Browse Menu"
          actionHref="/menu"
        />
      </div>
    );
  }

  if (cartLoading || !result) {
    return (
      <div className="container-lhh py-8">
        <h1 className="font-heading text-3xl text-brown">Checkout</h1>
        <div className="mt-6 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (result.hasIssues) {
    return (
      <div className="container-lhh py-16">
        <EmptyState
          title="Something changed in your cart"
          message="The stock or price of some items has changed — please check your cart again."
          actionLabel="Open Cart"
          onAction={() => navigate('/cart')}
        />
      </div>
    );
  }

  return (
    <div className="container-lhh py-8">
      <h1 className="font-heading text-3xl text-brown">Checkout</h1>
      <div className="mt-5">
        <Stepper current={step} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {step === 0 && (
            <>
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
                <h2 className="mb-3 font-heading text-xl text-brown">Delivery Date</h2>
                <DatePicker
                  days={days}
                  loading={availLoading}
                  error={availError}
                  selected={date}
                  onSelect={(k) => { setDate(k); setSlot(null); }}
                />
              </div>

              <div>
                <h2 className="mb-3 font-heading text-xl text-brown">Delivery Slot</h2>
                <SlotPicker slots={selectedDay?.slots || []} selected={slot} onSelect={setSlot} />
              </div>

              <div className="flex flex-col gap-4">
                <Input label="Special Note" value={specialNote} onChange={(e) => setSpecialNote(e.target.value)} placeholder="Less sweet, etc." />
                <Input label="Want something written on the cake?" value={cakeMessage} onChange={(e) => setCakeMessage(e.target.value)} placeholder="Happy Birthday Riya" />
                <Switch checked={isGift} onChange={setIsGift} label="Gift wrap this order" />
              </div>
            </>
          )}

          {step === 1 && (
            <PaymentSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
              utr={utr}
              onUtrChange={setUtr}
              utrError={errors.utr}
              settings={settings}
              amount={grandTotal}
              screenshotUrl={screenshotUrl}
              onScreenshotChange={setScreenshotUrl}
            />
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4 rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-5">
              <div>
                <p className="text-sm text-brown-mute">Contact</p>
                <p className="text-brown">{contact.name} • {contact.phone}</p>
              </div>
              <div>
                <p className="text-sm text-brown-mute">{deliveryType === 'pickup' ? 'Pickup' : 'Address'}</p>
                <p className="text-brown">
                  {deliveryType === 'pickup'
                    ? settings?.pickupAddress || 'Pickup from the shop'
                    : `${contact.line1}${contact.landmark ? `, ${contact.landmark}` : ''}, ${contact.area} - ${contact.pincode}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-brown-mute">Delivery</p>
                <p className="text-brown">
                  {date ? formatDayParts(date).weekday : ''} {date ? formatDayParts(date).dayNum : ''}{' '}
                  {date ? formatDayParts(date).month : ''} • {slot}
                </p>
              </div>
              <div>
                <p className="text-sm text-brown-mute">Payment</p>
                <p className="text-brown">
                  {paymentMethod}
                  {utr ? ` • UTR ${utr}` : ''}
                  {screenshotUrl ? ' • Screenshot attached' : ''}
                </p>
              </div>
              {(specialNote || cakeMessage) && (
                <div>
                  <p className="text-sm text-brown-mute">Notes</p>
                  {specialNote && <p className="text-brown">{specialNote}</p>}
                  {cakeMessage && <p className="text-brown">🎂 “{cakeMessage}”</p>}
                </div>
              )}
              <button type="button" onClick={() => setStep(0)} className="w-fit text-sm font-medium text-maroon underline">
                Edit details
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft size={16} strokeWidth={1.75} /> Back
              </Button>
            )}
            {step < 2 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button size="lg" loading={placing} loadingText="Placing your order..." onClick={placeOrder}>
                Place Order — ₹{grandTotal.toLocaleString('en-IN')}
              </Button>
            )}
          </div>
        </div>

        <OrderSummary
          lines={validLines}
          itemsTotal={itemsTotal}
          offerDiscount={offerDiscount}
          offers={preview.appliedOffers}
          offerCode={offerCode}
          deliveryCharge={deliveryCharge}
          packagingCharge={packagingCharge}
          grandTotal={grandTotal}
          offerError={preview.error}
        />
      </div>
    </div>
  );
}
