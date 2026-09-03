import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useSettingsDraft } from '../../../hooks/useSettingsDraft.js';
import { useToast } from '../../../hooks/useToast.js';
import { api } from '../../../lib/api.js';
import { Input } from '../../ui/Input.jsx';
import { Switch } from '../../ui/Switch.jsx';
import { Button } from '../../ui/Button.jsx';

const FIELDS = ['upiId', 'upiQrImage', 'payeeName', 'acceptCOD', 'acceptUPI'];

export function PaymentTab({ settings, onSave, saving }) {
  const { draft, setField, dirty } = useSettingsDraft(settings, FIELDS);
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/owner/upload', form);
      setField('upiQrImage')(data.url);
      toast.success('QR code uploaded — remember to save');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload the QR code');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Switch checked={draft.acceptUPI} onChange={setField('acceptUPI')} label="Accept UPI" />
        <Switch checked={draft.acceptCOD} onChange={setField('acceptCOD')} label="Accept Cash on Delivery" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="UPI ID" value={draft.upiId} onChange={(e) => setField('upiId')(e.target.value)} placeholder="lucky@upi" />
        <Input label="Payee Name" value={draft.payeeName} onChange={(e) => setField('payeeName')(e.target.value)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-brown">UPI QR Code</p>
        {draft.upiQrImage ? (
          <div className="flex items-center gap-3">
            <img src={draft.upiQrImage} alt="UPI QR" className="h-24 w-24 rounded-md border border-[rgba(169,141,116,0.25)] object-cover" />
            <Button size="sm" variant="secondary" onClick={() => setField('upiQrImage')('')}>
              <X size={14} strokeWidth={1.75} /> Remove
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={14} strokeWidth={1.75} /> Upload QR Code
          </Button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>

      <Button className="w-fit" loading={saving} disabled={!dirty} onClick={() => onSave(draft)}>
        Save Changes
      </Button>
    </div>
  );
}
