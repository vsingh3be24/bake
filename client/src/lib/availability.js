/** Serialize cart lines for the availability endpoints' `items` query param. */
export function serializeItemsParam(items = []) {
  return items.map((i) => `${i.productId}:${i.qty}`).join(',');
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Delivery days come back as UTC-midnight instants standing for a shop-local
 * calendar day, so they must be read in UTC — using local getters would shift
 * the label a day for anyone west of GMT.
 */
export function formatDayParts(dateInput) {
  const d = new Date(dateInput);
  return {
    key: d.toISOString().slice(0, 10),
    weekday: DAY_LABELS[d.getUTCDay()],
    dayNum: d.getUTCDate(),
    month: d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }),
  };
}

/** "YYYY-MM-DD" -> "YYYY-MM-DD" shifted by `days` (owner-side date navigation). */
export function shiftDateKey(key, days) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date as a "YYYY-MM-DD" key, in the viewer's own local calendar day. */
export function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const UNAVAILABLE_REASONS = {
  holiday: "We're closed that day",
  day_full: 'That day is fully booked',
  slots_full: 'All slots for that day are full',
  product_capacity_full: 'Your items are fully booked for that day',
  product_unavailable_on_day: "One of your items isn't made that day",
  too_far_ahead: "We can't take bookings that far ahead",
  past_date: 'That date has already passed',
};

export function reasonLabel(reason) {
  return UNAVAILABLE_REASONS[reason] || 'That day is not available';
}
