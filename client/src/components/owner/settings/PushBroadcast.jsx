import { useEffect, useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../hooks/useToast.js';
import { Input } from '../../ui/Input.jsx';
import { Button } from '../../ui/Button.jsx';

export function PushBroadcast() {
  const toast = useToast();
  const [status, setStatus] = useState(null); // { count, configured }
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .get('/owner/push/subscribers')
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus({ count: 0, configured: false }));
  }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please fill in both a title and a message');
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post('/owner/push/broadcast', {
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || undefined,
      });
      toast.success(`Sent to ${data.sent} of ${data.total} subscribers`);
      setTitle('');
      setBody('');
      setLink('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-md border border-[rgba(169,141,116,0.25)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bell size={16} strokeWidth={1.75} className="text-maroon" />
        <p className="text-sm font-medium text-brown">Push Notification</p>
        {status && (
          <span className="ml-auto text-xs text-brown-mute">
            {status.count} subscriber{status.count === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {!status ? (
        <p className="text-sm text-brown-mute">Loading…</p>
      ) : !status.configured ? (
        <p className="text-sm text-brown-soft">
          Not set up yet — add <code className="text-xs">VAPID_PUBLIC_KEY</code> /{' '}
          <code className="text-xs">VAPID_PRIVATE_KEY</code> to the server environment (see{' '}
          <code className="text-xs">.env.example</code>).
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-brown-soft">
            Send a real push notification to every customer who's opted in — reaches their phone even
            if the site isn't open.
          </p>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="New: Rose Pistachio Cake!" />
          <Input label="Message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={200} placeholder="Fresh off the oven — order now for this weekend." />
          <Input label="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/menu" helperText="A path on this site, e.g. /offers" />
          <Button className="w-fit" loading={sending} disabled={status.count === 0} onClick={send}>
            <Send size={14} strokeWidth={1.75} /> Send Notification
          </Button>
        </div>
      )}
    </div>
  );
}
