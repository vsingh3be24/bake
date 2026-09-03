import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export function lineKey(productId, variantLabel) {
  return `${productId}::${variantLabel || 'default'}`;
}

export const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      // Kept in the store so an applied coupon survives cart -> checkout.
      offerCode: null,

      setOfferCode: (offerCode) => set({ offerCode }),

      addItem: (product, qty, variantLabel = null) => {
        const key = lineKey(product._id, variantLabel);
        set((state) => {
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i)),
            };
          }
          const variant = variantLabel ? product.variants?.find((v) => v.label === variantLabel) : null;
          const price = variant ? variant.salePrice ?? variant.price : product.salePrice ?? product.price;
          return {
            items: [
              ...state.items,
              {
                key,
                productId: product._id,
                slug: product.slug,
                name: product.name,
                image: product.images?.[0] || null,
                variantLabel,
                price,
                qty,
                minQty: product.minQty || 1,
                maxQty: product.maxQty || 99,
                stepQty: product.stepQty || 1,
              },
            ],
          };
        });
      },

      updateQty: (key, qty) =>
        set((state) => ({
          items: state.items.map((i) => (i.key === key ? { ...i, qty } : i)),
        })),

      removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      // Silently corrects price/qty/limits after server revalidation —
      // does NOT remove items (out-of-stock removal is user-initiated).
      syncItem: (key, updates) =>
        set((state) => ({
          items: state.items.map((i) => (i.key === key ? { ...i, ...updates } : i)),
        })),

      clear: () => set({ items: [], offerCode: null }),
    }),
    { name: 'lhh-cart' }
  )
);

export function useCartCount() {
  return useCartStore((state) => state.items.reduce((sum, i) => sum + i.qty, 0));
}

export function useCartSubtotal() {
  return useCartStore((state) => state.items.reduce((sum, i) => sum + i.qty * i.price, 0));
}
