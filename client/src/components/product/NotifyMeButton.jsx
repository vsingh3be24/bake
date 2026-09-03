import { useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Modal } from '../ui/Modal.jsx';

export function NotifyMeButton({ productId, fullWidth = false }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/stock-alerts', { productId, phone });
      toast.success("Got it! We'll let you know when it's back.");
      setOpen(false);
      setPhone('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        fullWidth={fullWidth}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Bell size={16} strokeWidth={1.75} />
        Notify Me
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Stock Alert">
        <p className="mb-4 text-brown-soft">We'll let you know when this item is back in stock.</p>
        <Input
          label="Phone Number"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={error}
        />
        <Button className="mt-4" fullWidth loading={submitting} onClick={submit}>
          Notify Me
        </Button>
      </Modal>
    </>
  );
}
