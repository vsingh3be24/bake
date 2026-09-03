import Product from '../models/Product.js';

// Shared by POST /api/cart/validate and (later) order placement — both need
// the exact same server-authoritative stock/price/minQty checks.
export async function validateCartItems(items) {
  const results = [];
  let itemsTotal = 0;
  let hasIssues = false;

  for (const line of items) {
    const base = {
      productId: line.productId,
      variantLabel: line.variantLabel || null,
      requestedQty: line.qty,
    };

    const product = await Product.findById(line.productId).populate('category', 'name slug');

    if (!product || !product.isActive || !product.isVisible) {
      results.push({ ...base, valid: false, issue: 'unavailable', message: 'This item is no longer available' });
      hasIssues = true;
      continue;
    }

    let variant = null;
    if (line.variantLabel) {
      variant = product.variants?.find((v) => v.label === line.variantLabel);
      if (!variant) {
        results.push({
          ...base,
          valid: false,
          issue: 'unavailable',
          message: 'This variant is no longer available',
          name: product.name,
          image: product.images?.[0] || null,
        });
        hasIssues = true;
        continue;
      }
    }

    const minQty = product.minQty || 1;
    const maxQty = product.maxQty || 99;
    const stepQty = product.stepQty || 1;
    const stockMode = product.stockMode;
    const stockCount = variant ? variant.stockCount : product.stockCount;
    const inStock = product.inStock && (stockMode !== 'counted' || stockCount > 0);

    if (!inStock) {
      results.push({
        ...base,
        valid: false,
        issue: 'out_of_stock',
        message: `${product.name} is currently out of stock`,
        name: product.name,
        image: product.images?.[0] || null,
      });
      hasIssues = true;
      continue;
    }

    let qty = line.qty;
    let qtyAdjusted = false;
    // Why we changed it, so callers can explain rather than say "something changed".
    let adjustReason = null;
    let adjustMessage = null;

    if (qty < minQty) {
      qty = minQty;
      qtyAdjusted = true;
      adjustReason = 'min';
      adjustMessage = `${product.name} has a minimum of ${minQty}`;
    }
    if (qty > maxQty) {
      qty = maxQty;
      qtyAdjusted = true;
      adjustReason = 'max';
      adjustMessage = `You can order at most ${maxQty} of ${product.name}`;
    }
    if ((qty - minQty) % stepQty !== 0) {
      qty = minQty + Math.round((qty - minQty) / stepQty) * stepQty;
      qtyAdjusted = true;
      adjustReason = 'step';
      adjustMessage = `${product.name} is only available in multiples of ${stepQty}`;
    }

    if (stockMode === 'counted' && qty > stockCount) {
      if (stockCount < minQty) {
        results.push({
          ...base,
          valid: false,
          issue: 'out_of_stock',
          message: `Only ${stockCount} left of ${product.name} — minimum order is ${minQty}`,
          name: product.name,
          image: product.images?.[0] || null,
        });
        hasIssues = true;
        continue;
      }
      qty = stockCount;
      qtyAdjusted = true;
      adjustReason = 'stock';
      adjustMessage = `Only ${stockCount} left of ${product.name}`;
    }

    const price = variant ? variant.price : product.price;
    const salePrice = variant ? variant.salePrice : product.salePrice;
    const effectivePrice = salePrice ?? price;
    const subtotal = effectivePrice * qty;
    itemsTotal += subtotal;
    if (qtyAdjusted) hasIssues = true;

    results.push({
      ...base,
      valid: true,
      productId: product._id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] || null,
      variantLabel: line.variantLabel || null,
      qty,
      qtyAdjusted,
      adjustReason,
      adjustMessage,
      minQty,
      maxQty,
      stepQty,
      stockMode,
      price,
      salePrice,
      effectivePrice,
      subtotal,
      category: product.category ? { _id: product.category._id, name: product.category.name, slug: product.category.slug } : null,
    });
  }

  return { items: results, itemsTotal, hasIssues };
}
