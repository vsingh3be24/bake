const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP;

export function buildOrderWhatsAppLink({ orderId, itemList, grandTotal, paymentMethod, date, slot }) {
  const msg = encodeURIComponent(
    `Hi! I've just placed an order 🙏\n\n` +
    `Order ID: ${orderId}\n${itemList}\n` +
    `Total: ₹${grandTotal}\nPayment: ${paymentMethod}\n` +
    `Delivery: ${date}, ${slot}`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
}
