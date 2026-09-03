import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { pushSupported, getExistingSubscription, subscribeToPush, unsubscribeFromPush } from '../../lib/push.js';
import { useToast } from '../../hooks/useToast.js';
import { Card } from '../ui/Card.jsx';
import { Switch } from '../ui/Switch.jsx';

/** Lives in Profile so there's always a way back in, even after someone
 * dismissed the one-time prompt (PushOptIn) or denied it by accident. */
export function PushToggle() {
  const toast = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    getExistingSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  if (!pushSupported()) return null;

  const toggle = async (checked) => {
    setBusy(true);
    try {
      if (checked) {
        await subscribeToPush();
        setSubscribed(true);
        toast.success("You're subscribed to notifications");
      } else {
        await unsubscribeFromPush();
        setSubscribed(false);
        toast.success('Notifications turned off');
      }
    } catch (err) {
      if (!err.message?.includes('not granted')) {
        toast.error('Could not update notification settings');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex items-center gap-3 p-5">
      <Bell size={18} strokeWidth={1.75} className="text-maroon" />
      <div className="flex-1">
        <p className="font-medium text-brown">Notifications</p>
        <p className="text-sm text-brown-mute">New items and offers, sent to this device</p>
      </div>
      <Switch checked={subscribed} onChange={toggle} disabled={busy} />
    </Card>
  );
}
