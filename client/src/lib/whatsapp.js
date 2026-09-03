const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP;

/** The shop's contact number, without the country code, formatted for display. */
export function ownerPhoneDisplay() {
  const digits = (WHATSAPP_NUMBER || '').replace(/^91/, '');
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

export function buildOrderWhatsAppLink({ orderId, itemList, grandTotal, paymentMethod, date, slot }) {
  const msg = encodeURIComponent(
    `Hi! I've just placed an order 🙏\n\n` +
    `Order ID: ${orderId}\n${itemList}\n` +
    `Total: ₹${grandTotal}\nPayment: ${paymentMethod}\n` +
    `Delivery: ${date}, ${slot}`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
}
