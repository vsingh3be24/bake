import { useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useFavourites } from '../../hooks/useFavourites.js';
import { useToast } from '../../hooks/useToast.js';
import { ProductCard } from '../../components/product/ProductCard.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

export function Favourites() {
  const { products, loading, error } = useFavourites();
  const toast = useToast();

  useEffect(() => {
    if (error) toast.error(error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl text-brown">Favourites</h1>

      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}

      {!loading && error && products.length === 0 && <p className="text-out-stock">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <EmptyState
          icon={Heart}
          title="No favourites yet"
          message="Tap the heart on any item to save it here."
          actionLabel="Browse Menu"
          actionHref="/menu"
        />
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
