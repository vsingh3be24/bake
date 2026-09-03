// The reorder endpoint returns enough product data to build a real cart line
// (name, image, price, min/max/step) — this shapes it into what
// cartStore.addItem() expects, so the cart drawer never shows a nameless row.
export function addReorderItem(addItem, item) {
  addItem(
    {
      _id: item.productId,
      slug: item.slug,
      name: item.name,
      images: item.image ? [item.image] : [],
      price: item.price,
      salePrice: item.salePrice,
      variants: item.variants,
      minQty: item.minQty || 1,
      maxQty: item.maxQty || 99,
      stepQty: item.stepQty || 1,
    },
    item.qty,
    item.variantLabel
  );
}
