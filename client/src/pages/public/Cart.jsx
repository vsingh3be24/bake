import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ShoppingBag, Tag, X } from 'lucide-react';
import { useCartStore, useCartCount } from '../../store/cartStore.js';
import { useCartValidation } from '../../hooks/useCartValidation.js';
import { useOffers } from '../../hooks/useOffers.js';
import { useOfferPreview } from '../../hooks/useOfferPreview.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Stepper } from '../../components/ui/Stepper.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { formatRupees } from '../../lib/format.js';

function IssueBanner({ line, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[rgba(198,40,40,0.3)] bg-[rgba(198,40,40,0.06)] p-3.5">
      <AlertTriangle size={18} strokeWidth={1.75} className="shrink-0 text-out-stock" />
      <p className="flex-1 text-sm text-out-stock">
        {line.name ? `${line.name} — ` : ''}
        {line.message}
      </p>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-pill border border-out-stock px-3 py-1 text-sm font-medium text-out-stock hover:bg-[rgba(198,40,40,0.08)]"
      >
        Remove
      </button>
    </div>
  );
}

export function Cart() {
  const navigate = useNavigate();
  const toast = useToast();
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const setOfferCode = useCartStore((s) => s.setOfferCode);
  const offerCode = useCartStore((s) => s.offerCode);
  const cartCount = useCartCount();
  const { result, loading, error, priceChanged } = useCartValidation();
  const { offers } = useOffers();
  const preview = useOfferPreview({ items, code: offerCode, deliveryType: 'delivery' });

  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedOffer, setAppliedOffer] = useState(null);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplying(true);
    setCouponError('');
    try {
      const { data } = await api.post('/offers/validate', {
        code: couponInput.trim(),
        items: items.map((i) => ({ productId: i.productId, variantLabel: i.variantLabel, qty: i.qty })),
      });
      setAppliedOffer(data);
      setOfferCode(data.code); // survives navigation to checkout
      toast.success(`${data.title} applied`);
    } catch (err) {
      setCouponError(err.response?.data?.message || "This code couldn't be applied");
      setAppliedOffer(null);
    } finally {
      setApplying(false);
    }
  };

  if (cartCount === 0) {
    return (
      <div className="container-lhh py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Add something tasty!"
          actionLabel="Browse Menu"
          actionHref="/menu"
        />
      </div>
    );
  }

  if (loading || !result) {
    return (
      <div className="container-lhh py-8">
        <h1 className="font-heading text-3xl text-brown">Your Cart</h1>
        <div className="mt-6 flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-lhh py-16">
        <EmptyState title="Something went wrong" message={error} actionLabel="Try Again" onAction={() => window.location.reload()} />
      </div>
    );
  }

  const invalidLines = result.items.filter((l) => !l.valid);
  const validLines = result.items.filter((l) => l.valid);
  const itemsTotal = result.itemsTotal;

  // Totals come from the engine preview (auto-apply offers + any code, stacked)
  // so the number here is exactly what checkout will charge.
  const offerDiscount = preview.totalDiscount || 0;
  const packagingCharge = result.packagingCharge || 0;
  const deliveryCharge = preview.freeDelivery ? 0 : result.deliveryCharge;
  const grandTotal = Math.max(itemsTotal - offerDiscount, 0) + deliveryCharge + packagingCharge;
  const totalSavings = validLines.reduce((sum, l) => sum + (l.price - l.effectivePrice) * l.qty, 0) + offerDiscount;

  const amountToFreeDelivery = Math.max(result.freeDeliveryAbove - itemsTotal, 0);

  return (
    <div className="container-lhh py-8">
      <h1 className="font-heading text-3xl text-brown">Your Cart</h1>

      {priceChanged && (
        <p className="mt-3 text-sm text-info">The price of some items has changed — the latest price is shown below.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {invalidLines.map((line) => (
            <IssueBanner
              key={`${line.productId}-${line.variantLabel || ''}`}
              line={line}
              onRemove={() => removeItem(`${line.productId}::${line.variantLabel || 'default'}`)}
            />
          ))}

          {validLines.map((line) => {
            const key = `${line.productId}::${line.variantLabel || 'default'}`;
            return (
              <div key={key} className="flex gap-4 rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-4">
                <Link to={`/product/${line.slug}`} className="h-20 w-20 shrink-0 rounded-sm bg-cream-deep">
                  {line.image && <img src={line.image} alt={line.name} className="h-full w-full rounded-sm object-cover" />}
                </Link>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/product/${line.slug}`} className="font-medium text-brown hover:text-maroon">
                        {line.name}
                      </Link>
                      {line.variantLabel && <p className="text-xs text-brown-mute">{line.variantLabel}</p>}
                      {line.qtyAdjusted && (
                        <p className="mt-0.5 text-xs text-low-stock">
                          {line.adjustMessage
                            ? `${line.adjustMessage} — quantity set to ${line.qty}`
                            : `Quantity was changed to ${line.qty}`}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(key)}
                      aria-label={`Remove ${line.name}`}
                      className="text-brown-mute hover:text-out-stock"
                    >
                      <X size={18} strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Stepper
                      value={line.qty}
                      onChange={(qty) => updateQty(key, qty)}
                      min={line.minQty}
                      max={line.maxQty}
                      step={line.stepQty}
                    />
                    <span className="font-semibold tabular-nums text-brown">{formatRupees(line.subtotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {offers.length > 0 && (
            <div className="mt-2 rounded-md bg-cream-deep p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brown">
                <Tag size={15} strokeWidth={1.75} /> Available Offers
              </p>
              <div className="flex flex-col gap-1">
                {offers.map((o) => (
                  <p key={o._id} className="text-sm text-brown-soft">
                    &bull; {o.title}
                    {o.code ? ` — code: ${o.code}` : ' (auto-applied at checkout)'}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-5">
            <div className="flex gap-2">
              <Input
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                error={couponError}
                className="flex-1"
              />
              <Button variant="secondary" loading={applying} onClick={applyCoupon}>
                Apply
              </Button>
            </div>

            {appliedOffer && (
              <div className="mt-3 flex items-center justify-between rounded-sm bg-[rgba(46,125,50,0.08)] px-3 py-2 text-sm text-in-stock">
                <span>{appliedOffer.title} applied</span>
                <button
                  type="button"
                  onClick={() => { setAppliedOffer(null); setOfferCode(null); }}
                  className="font-medium underline"
                >
                  Remove
                </button>
              </div>
            )}

            {amountToFreeDelivery > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-sm text-brown-soft">
                  Add {formatRupees(amountToFreeDelivery)} more for FREE delivery!
                </p>
                <div className="h-2 overflow-hidden rounded-pill bg-cream-deep">
                  <div
                    className="h-full rounded-pill bg-olive transition-all"
                    style={{ width: `${Math.min((itemsTotal / result.freeDeliveryAbove) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 border-t border-[rgba(169,141,116,0.2)] pt-4 text-sm">
              <div className="flex justify-between text-brown-soft">
                <span>Items</span>
                <span className="tabular-nums">{formatRupees(itemsTotal)}</span>
              </div>
              {preview.appliedOffers.map((o) => (
                <div key={o.offerId} className="flex justify-between text-in-stock">
                  <span>{o.title}</span>
                  <span className="tabular-nums">
                    {o.freeDelivery && o.discountAmount === 0 ? 'FREE delivery' : `−${formatRupees(o.discountAmount)}`}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-brown-soft">
                <span>Delivery</span>
                <span className="tabular-nums">{deliveryCharge === 0 ? 'FREE' : formatRupees(deliveryCharge)}</span>
              </div>
              <div className="flex justify-between text-brown-soft">
                <span>Packaging</span>
                <span className="tabular-nums">{formatRupees(packagingCharge)}</span>
              </div>
              <div className="flex justify-between border-t border-[rgba(169,141,116,0.2)] pt-2 text-lg font-semibold text-brown">
                <span>Total</span>
                <span className="tabular-nums">{formatRupees(grandTotal)}</span>
              </div>
              {totalSavings > 0 && <p className="text-sm text-olive">You saved {formatRupees(totalSavings)} 🎉</p>}
              {preview.error && <p className="text-sm text-out-stock">{preview.error}</p>}
            </div>

            <Button
              fullWidth
              size="lg"
              className="mt-5"
              disabled={validLines.length === 0}
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
