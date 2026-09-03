import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { PriceTag } from './PriceTag.jsx';
import { StockBadge } from './StockBadge.jsx';
import { OfferRibbon } from './OfferRibbon.jsx';
import { ProductImage } from './ProductImage.jsx';
import { FavouriteButton } from './FavouriteButton.jsx';
import { NotifyMeButton } from './NotifyMeButton.jsx';
import { QtySelector } from './QtySelector.jsx';
import { getStockStatus } from '../../lib/stock.js';
import { useCartStore } from '../../store/cartStore.js';
import { useToast } from '../../hooks/useToast.js';
import { flyToCart } from '../motion/FlyToCart.js';

export function ProductCard({ product }) {
  const [qty, setQty] = useState(product.minQty || 1);
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const status = getStockStatus(product);
  const outOfStock = status.level === 'out';
  const imgRef = useRef(null);

  return (
    <Card hoverable className="flex flex-col overflow-hidden">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square bg-cream-deep">
        <ProductImage
          ref={imgRef}
          product={product}
          imgClassName={outOfStock ? 'grayscale' : ''}
        />
        <div className="absolute left-2.5 top-2.5">
          <OfferRibbon product={product} />
        </div>
        <FavouriteButton productId={product._id} className="absolute right-2.5 top-2.5" />
        {product.isHotSelling && (
          <Badge variant="hot" className="absolute bottom-2.5 left-2.5">
            HOT SELLING
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-heading text-xl text-brown">{product.name}</h3>
          <p className="line-clamp-1 text-sm text-brown-soft">{product.shortDesc}</p>
        </Link>

        <PriceTag price={product.price} salePrice={product.salePrice} />
        <StockBadge product={product} />

        <div className="flex items-center gap-3 text-xs text-brown-mute">
          {product.prepTimeHours > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock size={13} strokeWidth={1.75} />
              {product.prepTimeHours} hrs prep
            </span>
          )}
          <span>Min. {product.minQty} {product.minQty === 1 ? 'pc' : 'pcs'}</span>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {outOfStock ? (
            <NotifyMeButton productId={product._id} fullWidth />
          ) : (
            <>
              <QtySelector product={product} value={qty} onChange={setQty} />
              <Button
                fullWidth
                onClick={() => {
                  addItem(product, qty);
                  flyToCart(imgRef.current);
                  toast.success(`${product.name} added to cart`);
                }}
              >
                Add {qty} to Cart
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
