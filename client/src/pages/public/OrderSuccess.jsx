import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, MessageCircle, KeyRound } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { useConfetti } from '../../components/motion/Confetti.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { formatRupees } from '../../lib/format.js';
import { formatDayParts } from '../../lib/availability.js';
import { buildOrderWhatsAppLink } from '../../lib/whatsapp.js';

function ClaimAccountCard({ phone }) {
  const navigate = useNavigate();
  const claim = useAuthStore((s) => s.claim);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await claim(phone, password);
      navigate('/me');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not set a password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-2 w-full max-w-sm p-5 text-left">
      <div className="flex items-center gap-2">
        <KeyRound size={18} strokeWidth={1.75} className="text-maroon" />
        <p className="font-medium text-brown">Track your orders next time</p>
      </div>
      <p className="mt-1 text-sm text-brown-soft">
        Set a password for {phone} — one click and your account is ready.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
        <Input
          type="password"
          placeholder="Choose a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={loading} loadingText="Setting up...">
            Set Password
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Not now
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function OrderSuccess() {
  const { orderId } = useParams();
  // React Router state doesn't survive a page refresh — the order details
  // below degrade gracefully to "just the ID" rather than showing blanks.
  const { state } = useLocation();
  const burst = useConfetti();

  useEffect(() => {
    burst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const whatsappLink =
    state?.items?.length && state?.grandTotal != null
      ? buildOrderWhatsAppLink({
          orderId,
          itemList: state.items.map((i) => `${i.qty}× ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}`).join('\n'),
          grandTotal: state.grandTotal,
          paymentMethod: state.paymentMethod,
          date: state.deliveryDate
            ? `${formatDayParts(state.deliveryDate).weekday} ${formatDayParts(state.deliveryDate).dayNum} ${formatDayParts(state.deliveryDate).month}`
            : '',
          slot: state.deliverySlot,
        })
      : null;

  return (
    <div className="container-lhh flex flex-col items-center gap-4 py-16 text-center">
      <CheckCircle2 size={56} strokeWidth={1.5} className="text-in-stock" />
      <h1 className="font-heading text-3xl text-brown">Order Placed!</h1>
      <p className="text-brown-soft">Thank you! We'll confirm it shortly.</p>

      <div className="mt-4 w-full max-w-sm rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-5 text-left">
        <div className="flex justify-between py-1">
          <span className="text-brown-soft">Order ID</span>
          <span className="font-semibold text-brown">{orderId}</span>
        </div>
        {state?.grandTotal != null && (
          <div className="flex justify-between py-1">
            <span className="text-brown-soft">Total</span>
            <span className="font-semibold tabular-nums text-brown">{formatRupees(state.grandTotal)}</span>
          </div>
        )}
        {state?.deliveryDate && (
          <div className="flex justify-between py-1">
            <span className="text-brown-soft">Delivery</span>
            <span className="text-brown">
              {formatDayParts(state.deliveryDate).weekday} {formatDayParts(state.deliveryDate).dayNum}{' '}
              {formatDayParts(state.deliveryDate).month} • {state.deliverySlot}
            </span>
          </div>
        )}
        {state?.paymentMethod && (
          <div className="flex justify-between py-1">
            <span className="text-brown-soft">Payment</span>
            <span className="text-brown">{state.paymentMethod}</span>
          </div>
        )}
      </div>

      <p className="max-w-sm text-sm text-brown-mute">
        Save this Order ID — you'll need it to track your order.
      </p>

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-pill bg-olive px-5 py-2.5 font-medium text-cream transition-colors hover:brightness-95"
          >
            <MessageCircle size={16} strokeWidth={1.75} />
            Send on WhatsApp
          </a>
        )}
        <Button as={Link} to="/menu" variant={whatsappLink ? 'secondary' : 'primary'}>
          Continue Shopping
        </Button>
      </div>

      {state?.guestPhone && <ClaimAccountCard phone={state.guestPhone} />}
    </div>
  );
}
