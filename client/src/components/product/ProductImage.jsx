import { forwardRef, useEffect, useState } from 'react';

/**
 * Product image with a zero-config local fallback: if the product has no
 * uploaded image URL, it looks for `/products/<slug>.jpg` in client/public.
 * Drop a correctly-named file there and it appears — no DB or code change.
 * If neither loads, a clean "No image" placeholder shows instead of a broken
 * icon.
 */
export const ProductImage = forwardRef(function ProductImage(
  { product, className = '', imgClassName = '' },
  ref
) {
  const candidates = [];
  if (product.images?.[0]) candidates.push(product.images[0]);
  if (product.slug) {
    candidates.push(`/products/${product.slug}.jpg`);
    candidates.push(`/products/${product.slug}.png`);
    candidates.push(`/products/${product.slug}.jpeg`);
  }

  const [index, setIndex] = useState(0);

  // Reset when the product changes so a new card doesn't inherit a stale index.
  useEffect(() => {
    setIndex(0);
  }, [product._id, product.slug]);

  const src = candidates[index];

  if (!src) {
    return (
      <div
        ref={ref}
        className={`flex h-full w-full items-center justify-center text-brown-mute ${className}`}
      >
        No image
      </div>
    );
  }

  return (
    <img
      ref={ref}
      src={src}
      alt={product.name}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
      className={`h-full w-full object-cover ${imgClassName} ${className}`}
    />
  );
});
