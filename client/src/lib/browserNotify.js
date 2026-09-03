/** Whether the page can show OS-level notifications right now, permission already granted. */
export function canNotify() {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

/** Only call from a real user gesture (a button click) — browsers ignore/block silent auto-prompts. */
export async function requestNotifyPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Fires an OS notification only when the tab is actually in the background —
 * a toast already covers the foreground case, and duplicating both would be
 * noisy for something as frequent as an order status tick.
 */
export function notifyIfBackground(title, options) {
  if (!canNotify()) return;
  if (typeof document !== 'undefined' && !document.hidden) return;
  try {
    new Notification(title, options);
  } catch {
    // Some browsers (notably iOS Safari) advertise the API but throw on
    // construction outside a service worker — never let this break the flow.
  }
}
