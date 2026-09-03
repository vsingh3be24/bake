// All delivery-day math happens in the SHOP's timezone, not the server's.
// Render/Vercel run in UTC; the bakery runs in IST. Without this, an order
// placed at 2am IST would be bucketed into the previous calendar day —
// wrong earliest-delivery date and mis-counted slot capacity.
//
// Canonical representation of a delivery day: a Date at UTC midnight whose
// Y/M/D are the shop-local calendar day. Stored that way, day comparisons and
// Mongo queries are exact equality — no range scans, no drift.

const SHOP_TZ = process.env.SHOP_TIMEZONE || 'Asia/Kolkata';

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHOP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SHOP_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "YYYY-MM-DD" for the shop-local calendar day containing `date`. */
export function shopDayKey(date = new Date()) {
  return dayKeyFormatter.format(date);
}

/** "YYYY-MM-DD" -> Date at UTC midnight. */
export function dayKeyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** The shop's "today" as a canonical delivery day. */
export function shopToday(now = new Date()) {
  return dayKeyToDate(shopDayKey(now));
}

/** Shop-local UTC offset in minutes at `date` — derived, never hardcoded, so DST-observing zones stay correct. */
function shopOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUTC - date.getTime()) / 60_000);
}

/**
 * Real UTC instants bounding the shop-local calendar day containing `now` —
 * for range-querying `createdAt` (an actual timestamp), unlike `shopToday()`
 * which returns a sentinel-style day marker meant only for `deliveryDate`
 * equality checks.
 */
export function shopDayRange(now = new Date()) {
  const [y, m, d] = shopDayKey(now).split('-').map(Number);
  const offsetMin = shopOffsetMinutes(now);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMin * 60_000);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

/**
 * The real UTC instant at which a given shop-local calendar day ("YYYY-MM-DD")
 * begins. The offset is probed at midday of that date rather than midnight —
 * midday is safely inside the day for any offset, so a DST-observing zone
 * reads the offset actually in force then instead of one from the day before.
 */
export function shopDayStartFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const offsetMin = shopOffsetMinutes(probe);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMin * 60_000);
}

/**
 * Normalize anything ("2026-10-03", an ISO string, a Date) to the canonical
 * UTC-midnight delivery day. Returns null when unparseable.
 */
export function normalizeDay(input) {
  if (input == null) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return dayKeyToDate(input);
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return dayKeyToDate(shopDayKey(parsed));
}

export function addDays(day, n) {
  const next = new Date(day);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

/** 0 = Sunday .. 6 = Saturday, for a canonical delivery day. */
export function dayOfWeek(day) {
  return day.getUTCDay();
}

export function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Minutes since midnight, shop-local. */
export function shopMinutesNow(now = new Date()) {
  const parts = timeFormatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour').value);
  const minute = Number(parts.find((p) => p.type === 'minute').value);
  return hour * 60 + minute;
}

/** "21:00" -> 1260. Returns null for malformed input. */
export function parseHHMM(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export { SHOP_TZ };
