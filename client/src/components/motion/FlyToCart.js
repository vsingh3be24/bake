// Vanilla-DOM flying clone effect — deliberately outside React's render tree,
// same technique the spec's own E.4 sample uses. Runs once per Add to Cart click.
export function flyToCart(imgEl, cartTargetId = 'cart-icon') {
  if (!imgEl) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const cartEl = document.getElementById(cartTargetId);
  if (!cartEl) return;

  const cartRect = cartEl.getBoundingClientRect();
  const srcRect = imgEl.getBoundingClientRect();
  if (cartRect.width === 0 || srcRect.width === 0) return; // target not visible right now

  const clone = imgEl.cloneNode(true);
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${srcRect.left}px`,
    top: `${srcRect.top}px`,
    width: `${srcRect.width}px`,
    height: `${srcRect.height}px`,
    borderRadius: '50%',
    zIndex: 9999,
    pointerEvents: 'none',
    objectFit: 'cover',
    transition: 'all .8s cubic-bezier(.19,1,.22,1)',
  });
  document.body.appendChild(clone);

  requestAnimationFrame(() => {
    Object.assign(clone.style, {
      left: `${cartRect.left + cartRect.width / 2 - 10}px`,
      top: `${cartRect.top + cartRect.height / 2 - 10}px`,
      width: '20px',
      height: '20px',
      opacity: '0.3',
    });
  });

  setTimeout(() => clone.remove(), 800);
}
