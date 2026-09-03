import { Gift } from 'lucide-react';
import { useRewards } from '../../hooks/useRewards.js';
import { Card } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { CountUp } from '../../components/motion/CountUp.jsx';
import { formatRupees } from '../../lib/format.js';

export function Rewards() {
  const { rewards, loading, error } = useRewards();

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-heading text-2xl text-brown">Rewards</h1>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !rewards) {
    return <EmptyState title="Could not load rewards" message={error} />;
  }

  if (!rewards.enabled) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-heading text-2xl text-brown">Rewards</h1>
        <EmptyState icon={Gift} title="Rewards coming soon" message="We're not running a loyalty program yet." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl text-brown">Rewards</h1>

      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <Gift size={32} strokeWidth={1.5} className="text-maroon" />
        <CountUp value={rewards.points} className="text-4xl font-semibold text-brown" />
        <p className="text-brown-soft">points = {formatRupees(rewards.value)}</p>
        {rewards.canRedeem ? (
          <p className="mt-2 text-sm text-in-stock">You can redeem these at checkout!</p>
        ) : (
          <p className="mt-2 text-sm text-brown-mute">
            Earn {rewards.minPointsToRedeem - rewards.points} more points to unlock redemption.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 font-heading text-xl text-brown">How it works</h2>
        <ul className="flex flex-col gap-1.5 text-sm text-brown-soft">
          <li>• Earn {rewards.pointsPerHundred} point for every ₹100 you spend</li>
          <li>• Each point is worth {formatRupees(rewards.pointValue)}</li>
          <li>• Redeem once you have at least {rewards.minPointsToRedeem} points</li>
        </ul>
      </Card>
    </div>
  );
}
