import { formatRupees } from './format.js';
import { formatDayParts } from './availability.js';

/** Opens a narrow, thermal-printer-friendly slip in a new tab and triggers print. */
export function printOrderSlip(order) {
  const { weekday, dayNum, month } = formatDayParts(order.deliveryDate);
  const itemRows = order.items
    .map(
      (i) =>
        `<tr><td>${i.qty}× ${escapeHtml(i.nameSnapshot)}${i.variantLabel ? ` (${escapeHtml(i.variantLabel)})` : ''}</td><td class="r">${formatRupees(i.subtotal)}</td></tr>`
    )
    .join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${order.orderId}</title>
<style>
  body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 12px; font-size: 13px; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
  .center { text-align: center; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  .total { font-weight: bold; font-size: 14px; }
</style></head>
<body>
  <h1>Lucky's Home Harvest</h1>
  <p class="center">${order.orderId}</p>
  <hr>
  <p>${escapeHtml(order.contact.name)}<br>${escapeHtml(order.contact.phone)}</p>
  <p>${weekday} ${dayNum} ${month} • ${escapeHtml(order.deliverySlot)}<br>${order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}</p>
  <hr>
  <table>${itemRows}</table>
  <hr>
  <table>
    <tr><td>Items</td><td class="r">${formatRupees(order.itemsTotal)}</td></tr>
    <tr><td>Delivery</td><td class="r">${order.deliveryCharge === 0 ? 'FREE' : formatRupees(order.deliveryCharge)}</td></tr>
    <tr><td>Packaging</td><td class="r">${formatRupees(order.packagingCharge)}</td></tr>
    <tr class="total"><td>Total</td><td class="r">${formatRupees(order.grandTotal)}</td></tr>
  </table>
  <hr>
  <p>${escapeHtml(order.paymentMethod)} • ${escapeHtml(order.paymentStatus)}</p>
  ${order.specialNote ? `<p>Note: ${escapeHtml(order.specialNote)}</p>` : ''}
  ${order.cakeMessage ? `<p>Cake: "${escapeHtml(order.cakeMessage)}"</p>` : ''}
</body></html>`;

  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
