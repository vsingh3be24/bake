import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { invalidateOffersCache } from '../../hooks/useOffers.js';

/** The Stock screen's ⚡ "clear stock" one-tap flash (Part D.4/D.7). */
export function QuickFlashModal({ product, onClose, onCreated }) {
  const toast = useToast();
  const [percent, setPercent] = useState(25);
  const [hours, setHours] = useState(6);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setPercent(25);
      setHours(6);
    }
  }, [product]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/owner/offers/quick-flash', {
        productId: product._id,
        percent: Number(percent),
        hours: Number(hours),
      });
      invalidateOffersCache();
      toast.success(`Flash offer live on ${product.name} for ${hours}h`);
      onCreated?.(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start the flash offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={`⚡ Flash Offer — ${product?.name || ''}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={submitting} onClick={submit}>
            Launch Flash
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-brown-soft">
          Starts a discount on just this item, live right now, stacking on top of any other offers a customer
          already qualifies for.
        </p>
        <Input
          label="Discount"
          type="number"
          min={1}
          max={90}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          helperText="Percent off"
        />
        <Input
          label="Duration (hours)"
          type="number"
          min={1}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </div>
    </Modal>
  );
}
