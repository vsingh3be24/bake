// The spec's own deep link references `tn=LHH-{orderId}`, but no order exists
// yet at payment time — Phase 10 deliberately places the order atomically at
// final submission (never a dangling "pending" order holding stock hostage).
// So the transaction note carries a short client-side reference instead; the
// owner reconciles UPI payments against the UTR the customer enters, not tn.
export function buildUpiLink({ upiId, payeeName, amount, note = 'LHH Order' }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: String(amount),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
