function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Downloads the given customers as a CSV file. */
export function downloadCustomersCsv(customers) {
  const header = ['Name', 'Phone', 'Tier', 'Orders', 'Total Spent', 'Last Order', 'Blocked'];
  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.tier,
    c.totalOrders,
    c.totalSpent,
    c.lastOrderAt ? new Date(c.lastOrderAt).toISOString().slice(0, 10) : '',
    c.isBlocked ? 'Yes' : 'No',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Phone numbers ready to paste into a WhatsApp broadcast list. */
export function phoneListText(customers) {
  return customers.map((c) => `91${c.phone}`).join('\n');
}
