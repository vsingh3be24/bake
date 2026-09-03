export function getStockStatus(product) {
  if (!product.inStock) {
    return {
      level: 'out',
      label: product.restockDate
        ? `Out of stock — back on ${new Date(product.restockDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : 'Out of stock',
    };
  }
  if (product.stockMode === 'counted') {
    if (product.stockCount <= 0) return { level: 'out', label: 'Out of stock' };
    if (product.stockCount <= product.lowStockThreshold) {
      return { level: 'low', label: `Only ${product.stockCount} left` };
    }
  }
  return { level: 'in', label: 'In Stock' };
}

export function getSavings(price, salePrice) {
  if (!salePrice || salePrice >= price) return null;
  const amount = price - salePrice;
  const percent = Math.round((amount / price) * 100);
  return { amount, percent };
}
