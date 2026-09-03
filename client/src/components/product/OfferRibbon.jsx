import { Zap } from 'lucide-react';
import { getSavings } from '../../lib/stock.js';
import { useOffers } from '../../hooks/useOffers.js';
import { Badge } from '../ui/Badge.jsx';

function offerTargetsProduct(offer, product) {
  if (offer.appliesTo === 'all' || offer.appliesTo === 'cart_total') return true;
  const targetIds = (offer.targetIds || []).map(String);
  if (offer.appliesTo === 'product') return targetIds.includes(String(product._id));
  if (offer.appliesTo === 'category') {
    const catId = product.category?._id || product.category;
    return targetIds.includes(String(catId));
  }
  return false;
}

export function OfferRibbon({ product }) {
  const { offers } = useOffers();

  // Flash offer targeting this product wins over the plain sale-price ribbon
  // — it's the "⚡ product cards pe corner ribbon" feel from Part D.7.
  const flash = offers.find((o) => o.isFlash && o.badgeText && offerTargetsProduct(o, product));
  if (flash) {
    return (
      <Badge variant="sale" className="gap-1" style={{ backgroundColor: flash.flashBannerColor || undefined }}>
        <Zap size={11} strokeWidth={2.5} />
        {flash.badgeText}
      </Badge>
    );
  }

  const savings = getSavings(product.price, product.salePrice);
  if (!savings) return null;
  return <Badge variant="sale">{savings.percent}% OFF</Badge>;
}
