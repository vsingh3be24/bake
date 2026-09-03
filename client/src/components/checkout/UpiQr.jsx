import { useRef, useState } from 'react';
import { Copy, Check, Smartphone, ImagePlus, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { buildUpiLink } from '../../lib/upi.js';
import { useToast } from '../../hooks/useToast.js';
import { Button } from '../ui/Button.jsx';

// Real phones only — a upi:// link does nothing useful on desktop, where the
// QR code below is the actual payment path.
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function UpiQr({ settings, amount, screenshotUrl, onScreenshotChange }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upiId = settings?.upiId;
  const payLink = upiId
    ? buildUpiLink({ upiId, payeeName: settings?.payeeName || "Lucky's Home Harvest", amount })
    : null;

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please select it manually');
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/uploads/payment-screenshot', form);
      onScreenshotChange(data.url);
      toast.success('Screenshot uploaded');
    } catch (err) {
      // Screenshot is explicitly optional — a failed upload should never
      // block checkout, the UTR field alone is enough for the owner. The
      // server's errorHandler guarantees this message is always safe to
      // show (a deliberate validation message, or a generic fallback).
      toast.error(err.response?.data?.message || "Couldn't upload the screenshot — the UTR alone is fine too");
    } finally {
      setUploading(false);
    }
  };

  if (!upiId) {
    return <p className="text-sm text-brown-mute">UPI details are not set up yet — please try Cash on Delivery.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {settings?.upiQrImage ? (
        <img
          src={settings.upiQrImage}
          alt="UPI QR Code"
          className="h-48 w-48 rounded-md border border-[rgba(169,141,116,0.3)] bg-paper object-contain p-2"
        />
      ) : (
        <div className="flex h-48 w-48 items-center justify-center rounded-md border border-dashed border-[rgba(169,141,116,0.4)] bg-paper text-sm text-brown-mute">
          QR code coming soon
        </div>
      )}

      <button
        type="button"
        onClick={copyUpiId}
        className="inline-flex items-center gap-2 rounded-pill border border-[rgba(169,141,116,0.35)] px-4 py-2 text-sm font-medium text-brown transition-colors hover:border-maroon"
      >
        {upiId}
        {copied ? <Check size={15} strokeWidth={2} className="text-in-stock" /> : <Copy size={15} strokeWidth={1.75} />}
      </button>

      {isMobile() && payLink && (
        <Button as="a" href={payLink} fullWidth>
          <Smartphone size={16} strokeWidth={1.75} />
          Pay ₹{amount.toLocaleString('en-IN')}
        </Button>
      )}

      <div className="w-full">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        {screenshotUrl ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-cream-deep px-3 py-2 text-sm text-brown-soft">
            <span>✅ Screenshot attached</span>
            <button type="button" onClick={() => onScreenshotChange(null)} aria-label="Remove screenshot" className="text-brown-mute hover:text-out-stock">
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            fullWidth
            loading={uploading}
            loadingText="Uploading..."
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={16} strokeWidth={1.75} />
            Add Payment Screenshot (Optional)
          </Button>
        )}
      </div>
    </div>
  );
}
