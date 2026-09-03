import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, Clock } from 'lucide-react';
import { useProduct } from '../../hooks/useProduct.js';
import { useProducts } from '../../hooks/useProducts.js';
import { useOffers } from '../../hooks/useOffers.js';
import { useCartStore } from '../../store/cartStore.js';
import { useToast } from '../../hooks/useToast.js';
import { PriceTag } from '../../components/product/PriceTag.jsx';
import { StockBadge } from '../../components/product/StockBadge.jsx';
import { VariantPicker } from '../../components/product/VariantPicker.jsx';
import { QtySelector } from '../../components/product/QtySelector.jsx';
import { NotifyMeButton } from '../../components/product/NotifyMeButton.jsx';
import { FavouriteButton } from '../../components/product/FavouriteButton.jsx';
import { ProductImage } from '../../components/product/ProductImage.jsx';
import { ProductCard } from '../../components/product/ProductCard.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { getStockStatus } from '../../lib/stock.js';
import { flyToCart } from '../../components/motion/FlyToCart.js';

function AccordionSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[rgba(169,141,116,0.2)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3.5 text-left font-medium text-brown"
      >
        {title}
        <ChevronDown size={18} strokeWidth={1.75} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-4 text-brown-soft">{children}</div>}
    </div>
  );
}

export function ProductDetail() {
  const { slug } = useParams();
  const { product, loading, error } = useProduct(slug);
  const { offers } = useOffers();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const [variantLabel, setVariantLabel] = useState(null);
  const [qty, setQty] = useState(1);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!product) return;
    setQty(product.minQty || 1);
    if (product.hasVariants && product.variants?.length) {
      setVariantLabel(product.variants[0].label);
    } else {
      setVariantLabel(null);
    }
  }, [product]);

  const { products: related } = useProducts(
    product ? { category: product.category?.slug, sort: 'popular' } : {}
  );

  if (loading) {
    return (
      <div className="container-lhh grid grid-cols-1 gap-8 py-8 sm:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-lhh py-16">
        <EmptyState
          title="This item was not found"
          message={error || 'It may no longer be available'}
          actionLabel="Browse Menu"
          actionHref="/menu"
        />
      </div>
    );
  }

  const variant = variantLabel ? product.variants?.find((v) => v.label === variantLabel) : null;
  const price = variant ? variant.price : product.price;
  const salePrice = variant ? variant.salePrice : product.salePrice;
  const effectivePrice = salePrice ?? price;
  const status = getStockStatus(product);
  const outOfStock = status.level === 'out' || (variant && variant.stockCount <= 0);

  const applicableOffers = offers.filter((o) => {
    if (o.appliesTo === 'all') return true;
    if (o.appliesTo === 'product') return o.targetIds?.includes(product._id);
    if (o.appliesTo === 'category') return o.targetIds?.includes(product.category?._id);
    return false;
  });

  const relatedProducts = related.filter((p) => p._id !== product._id).slice(0, 8);

  const handleAddToCart = () => {
    addItem(product, qty, variantLabel);
    flyToCart(imgRef.current);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="container-lhh pb-36 pt-8 sm:pb-8">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-md bg-cream-deep">
          <ProductImage ref={imgRef} product={product} />
          <FavouriteButton productId={product._id} className="absolute right-3 top-3" />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-3xl text-brown">{product.name}</h1>
              {product.isHotSelling && <Badge variant="hot">HOT SELLING</Badge>}
              {product.isNew && <Badge variant="new">NEW</Badge>}
            </div>
            <p className="mt-1 text-brown-soft">{product.shortDesc}</p>
          </div>

          <PriceTag price={price} salePrice={salePrice} showSavings size="lg" />
          <StockBadge product={product} />

          {product.prepTimeHours > 0 && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-cream-deep px-3 py-1.5 text-sm text-brown-soft">
              <Clock size={15} strokeWidth={1.75} />
              Order {product.prepTimeHours} hrs in advance
            </span>
          )}

          {product.hasVariants && product.variants?.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-brown">Variant</p>
              <VariantPicker variants={product.variants} selected={variantLabel} onChange={setVariantLabel} />
            </div>
          )}

          {!outOfStock && (
            <div className="flex items-center gap-4">
              <QtySelector product={product} value={qty} onChange={setQty} />
              <span className="text-brown-soft">
                = <span className="font-semibold text-brown">₹{(effectivePrice * qty).toLocaleString('en-IN')}</span>
              </span>
            </div>
          )}

          <div className="hidden sm:block">
            {outOfStock ? (
              <NotifyMeButton productId={product._id} />
            ) : (
              <Button size="lg" onClick={handleAddToCart}>
                Add {qty} to Cart — ₹{(effectivePrice * qty).toLocaleString('en-IN')}
              </Button>
            )}
          </div>

          {applicableOffers.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-md bg-cream-deep p-3.5">
              <p className="text-sm font-medium text-brown">Applicable Offers</p>
              {applicableOffers.map((o) => (
                <p key={o._id} className="text-sm text-brown-soft">
                  &bull; {o.title}
                  {o.code ? ` (${o.code})` : ''}
                </p>
              ))}
            </div>
          )}

          <div className="mt-2">
            <AccordionSection title="Description" defaultOpen>
              <p>{product.longDesc || product.shortDesc}</p>
            </AccordionSection>
            <AccordionSection title="Ingredients & Allergens">
              {product.allergens?.length ? (
                <p>Contains: {product.allergens.join(', ')}</p>
              ) : (
                <p>No major allergens listed.</p>
              )}
              {product.nutritionNote && <p className="mt-1">{product.nutritionNote}</p>}
            </AccordionSection>
            <AccordionSection title="Storage">
              <p>Store in a cool, dry place. For best taste, consume within 2-3 days.</p>
            </AccordionSection>
            <AccordionSection title="Delivery Info">
              <p>You can choose your delivery date and slot at checkout.</p>
            </AccordionSection>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-2xl text-brown">You Might Also Like</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      <div
        className="fixed inset-x-0 z-40 flex items-center justify-between gap-4 border-t border-[rgba(169,141,116,0.2)] bg-paper px-4 py-3 sm:hidden"
        style={{ bottom: 'var(--mobile-nav-h)' }}
      >
        <div>
          <p className="text-xs text-brown-mute">Total</p>
          <p className="font-semibold tabular-nums text-brown">
            ₹{outOfStock ? '—' : (effectivePrice * qty).toLocaleString('en-IN')}
          </p>
        </div>
        {outOfStock ? (
          <NotifyMeButton productId={product._id} />
        ) : (
          <Button onClick={handleAddToCart}>Add {qty} to Cart</Button>
        )}
      </div>
    </div>
  );
}
