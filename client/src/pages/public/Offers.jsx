import { Link } from 'react-router-dom';
import { Zap, Tag } from 'lucide-react';
import { useOffers } from '../../hooks/useOffers.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Reveal } from '../../components/motion/Reveal.jsx';
import { Stagger } from '../../components/motion/Stagger.jsx';

function pad(n) {
  return String(n).padStart(2, '0');
}

function OfferCountdown({ endAt }) {
  const countdown = useCountdown(endAt);
  if (!countdown || countdown.expired) return null;
  return (
    <span className="tabular-nums font-semibold text-crimson">
      {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)} left
    </span>
  );
}

export function Offers() {
  const { offers, loading, error } = useOffers();

  return (
    <div className="container-lhh py-8">
      <h1 className="font-heading text-3xl text-brown">All Offers</h1>
      <p className="mt-1 text-brown-soft">Everything live right now — auto-applied offers need no code.</p>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Tag}
          title="Could not load offers"
          message={error}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      ) : offers.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No offers right now"
          message="Check back soon — we run flash deals regularly."
          actionLabel="Browse Menu"
          actionHref="/menu"
        />
      ) : (
        <Reveal>
          <Stagger className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <Card key={offer._id} className="flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="flex items-center gap-1.5 font-heading text-lg text-brown">
                    {offer.isFlash && <Zap size={16} strokeWidth={2} className="shrink-0 text-crimson" />}
                    {offer.title}
                  </h2>
                  {offer.badgeText && <Badge variant="sale">{offer.badgeText}</Badge>}
                </div>
                {offer.subtitle && <p className="text-sm text-brown-soft">{offer.subtitle}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {offer.code ? (
                    <span className="rounded-sm bg-cream-deep px-2 py-0.5 font-mono text-xs text-brown">{offer.code}</span>
                  ) : (
                    <span className="text-brown-mute">Auto-applied at checkout</span>
                  )}
                  {offer.minOrderValue > 0 && (
                    <span className="text-brown-mute">Min. order ₹{offer.minOrderValue}</span>
                  )}
                </div>
                {offer.isFlash && offer.endAt && <OfferCountdown endAt={offer.endAt} />}
              </Card>
            ))}
          </Stagger>
        </Reveal>
      )}

      <div className="mt-8">
        <Link to="/menu" className="text-sm font-medium text-maroon underline">
          Browse the menu to use these offers →
        </Link>
      </div>
    </div>
  );
}
