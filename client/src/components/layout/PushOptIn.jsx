import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { pushSupported, getExistingSubscription, subscribeToPush } from '../../lib/push.js';
import { useToast } from '../../hooks/useToast.js';
import { Button } from '../ui/Button.jsx';

const DISMISS_KEY = 'lhh_push_prompt_dismissed';

/** A one-time, dismissible prompt — not another top banner (Announcement
 * and Flash already own that spot). Never shown again once dismissed,
 * subscribed, or on a browser that can't do push at all. */
export function PushOptIn() {
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (Notification.permission === 'denied') return;

    getExistingSubscription().then((sub) => {
      if (!sub) setVisible(true);
    });
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const enable = async () => {
    setSubscribing(true);
    try {
      await subscribeToPush();
      toast.success("You're subscribed — we'll ping you about new items and offers");
      dismiss();
    } catch (err) {
      // Denial is an expected, non-error outcome — just close quietly.
      if (err.message?.includes('not granted')) {
        dismiss();
      } else {
        toast.error('Could not enable notifications — please try again later');
      }
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-sm items-start gap-3 rounded-md border border-[rgba(169,141,116,0.3)] bg-paper p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-cream-deep">
            <Bell size={16} strokeWidth={1.75} className="text-maroon" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-brown">Get notified about new items &amp; offers?</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" loading={subscribing} onClick={enable}>
                Enable
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-brown-mute hover:text-brown">
            <X size={16} strokeWidth={1.75} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
