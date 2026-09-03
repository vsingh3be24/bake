import { formatRupees } from '../../lib/format.js';

export function OrderSummary({ lines, itemsTotal, offerDiscount, offers, offerCode, deliveryCharge, packagingCharge, grandTotal, offerError }) {
  return (
    <div className="rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-5">
      <h3 className="font-heading text-xl text-brown">Order Summary</h3>

      <div className="mt-4 flex flex-col gap-2">
        {lines.map((l) => (
          <div key={`${l.productId}-${l.variantLabel || ''}`} className="flex justify-between text-sm">
            <span className="text-brown-soft">
              {l.qty} × {l.name}
              {l.variantLabel ? ` (${l.variantLabel})` : ''}
            </span>
            <span className="tabular-nums text-brown">{formatRupees(l.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-[rgba(169,141,116,0.2)] pt-4 text-sm">
        <div className="flex justify-between text-brown-soft">
          <span>Items</span>
          <span className="tabular-nums">{formatRupees(itemsTotal)}</span>
        </div>
        {offers?.length > 0
          ? offers.map((o) => (
              <div key={o.offerId} className="flex justify-between text-in-stock">
                <span>{o.title}</span>
                <span className="tabular-nums">
                  {o.freeDelivery && o.discountAmount === 0 ? 'FREE delivery' : `−${formatRupees(o.discountAmount)}`}
                </span>
              </div>
            ))
          : offerDiscount > 0 && (
              <div className="flex justify-between text-in-stock">
                <span>Offer {offerCode}</span>
                <span className="tabular-nums">&minus;{formatRupees(offerDiscount)}</span>
              </div>
            )}
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
        {offerError && <p className="text-out-stock">{offerError}</p>}
      </div>
    </div>
  );
}
