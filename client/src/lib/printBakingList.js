import { formatDayParts } from './availability.js';
import { formatRupees } from './format.js';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Opens an A4-friendly printable version of the baking list in a new tab. */
export function printBakingList(list) {
  const { weekday, dayNum, month } = formatDayParts(list.date);

  const sections = list.categories
    .map(
      (cat) => `
      <h3>${escapeHtml(cat.name)}</h3>
      <table>
        ${cat.items
          .map(
            (item) =>
              `<tr><td class="box">☐</td><td>${escapeHtml(item.name)}</td><td class="r">${item.qty} pc${item.qty === 1 ? '' : 's'}</td><td class="r muted">(${item.orderCount} order${item.orderCount === 1 ? '' : 's'})</td></tr>`
          )
          .join('')}
      </table>`
    )
    .join('');

  const notes = list.specialInstructions
    .map(
      (n) =>
        `<p>#${escapeHtml(n.orderId)} — ${n.notes.map(escapeHtml).join(', ')} (${escapeHtml(n.customerName)})</p>`
    )
    .join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Baking List — ${weekday} ${dayNum} ${month}</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h3 { font-size: 15px; margin: 18px 0 6px; border-bottom: 1px solid #333; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 4px 6px; vertical-align: top; }
  .box { width: 20px; font-size: 16px; }
  .r { text-align: right; white-space: nowrap; }
  .muted { color: #777; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #333; font-weight: bold; }
  .notes { margin-top: 16px; padding: 10px; background: #fff8e1; font-size: 13px; }
</style></head>
<body>
  <h1>Baking List — ${weekday} ${dayNum} ${month}</h1>
  ${sections}
  ${notes ? `<div class="notes"><strong>⚠️ Special Instructions</strong>${notes}</div>` : ''}
  <p class="footer">Total: ${list.totals.orders} order${list.totals.orders === 1 ? '' : 's'} • ${list.totals.items} item${list.totals.items === 1 ? '' : 's'} • ${formatRupees(list.totals.revenue)}</p>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

/** Plain-text summary for WhatsApp share (opens the share picker, no fixed number). */
export function bakingListShareText(list) {
  const { weekday, dayNum, month } = formatDayParts(list.date);
  const lines = [`*Baking List — ${weekday} ${dayNum} ${month}*`, ''];
  for (const cat of list.categories) {
    lines.push(`*${cat.name}*`);
    for (const item of cat.items) {
      const pcs = item.qty === 1 ? 'pc' : 'pcs';
      const orders = item.orderCount === 1 ? 'order' : 'orders';
      lines.push(`• ${item.name} — ${item.qty} ${pcs} (${item.orderCount} ${orders})`);
    }
    lines.push('');
  }
  if (list.specialInstructions.length > 0) {
    lines.push('⚠️ Special Instructions');
    for (const n of list.specialInstructions) lines.push(`#${n.orderId} — ${n.notes.join(', ')} (${n.customerName})`);
    lines.push('');
  }
  lines.push(
    `Total: ${list.totals.orders} order${list.totals.orders === 1 ? '' : 's'} • ${list.totals.items} item${list.totals.items === 1 ? '' : 's'}`
  );
  return lines.join('\n');
}
