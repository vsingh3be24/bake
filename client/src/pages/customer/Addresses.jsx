import { useState } from 'react';
import { MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { useAddresses } from '../../hooks/useAddresses.js';
import { useToast } from '../../hooks/useToast.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

const EMPTY_FORM = { label: 'Home', line1: '', landmark: '', area: '', pincode: '', isDefault: false };

function AddressForm({ value, onChange, errors }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <div className="flex flex-col gap-4">
      <Input label="Label" value={value.label} onChange={set('label')} placeholder="Home / Office" />
      <Input label="Address" required value={value.line1} onChange={set('line1')} error={errors.line1} placeholder="Flat / House, Street" />
      <Input label="Landmark" value={value.landmark} onChange={set('landmark')} placeholder="Nearby landmark" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Area" required value={value.area} onChange={set('area')} error={errors.area} placeholder="Salt Lake" />
        <Input
          label="Pincode"
          required
          inputMode="numeric"
          maxLength={6}
          value={value.pincode}
          onChange={set('pincode')}
          error={errors.pincode}
          placeholder="700064"
        />
      </div>
    </div>
  );
}

export function Addresses() {
  const { addresses, loading, error, add, update, remove } = useAddresses();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (address) => {
    setEditingId(address._id);
    setForm({ ...address });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.line1.trim()) e.line1 = 'Please enter an address';
    if (!form.area.trim()) e.area = 'Please enter an area';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Please enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) await update(editingId, form);
      else await add(form);
      setModalOpen(false);
      toast.success('Address saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save this address');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id) => {
    try {
      await remove(id);
      toast.success('Address removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove this address');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-brown">Addresses</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} strokeWidth={1.75} /> Add Address
        </Button>
      </div>

      {loading && <Skeleton className="h-32 w-full" />}

      {!loading && error && <p className="text-out-stock">{error}</p>}

      {!loading && !error && addresses.length === 0 && (
        <EmptyState icon={MapPin} title="No saved addresses" message="Add one to check out faster next time." actionLabel="Add Address" onAction={openAdd} />
      )}

      {!loading && addresses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a._id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-brown">{a.label}</span>
                {a.isDefault && <Badge variant="in-stock">Default</Badge>}
              </div>
              <p className="text-sm text-brown-soft">
                {a.line1}
                {a.landmark ? `, ${a.landmark}` : ''}, {a.area} - {a.pincode}
              </p>
              <div className="mt-1 flex gap-3 text-sm">
                <button type="button" onClick={() => openEdit(a)} className="font-medium text-maroon underline">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteAddress(a._id)}
                  className="inline-flex items-center gap-1 text-out-stock"
                >
                  <Trash2 size={14} strokeWidth={1.75} /> Remove
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => update(a._id, { isDefault: true })}
                    className="inline-flex items-center gap-1 text-brown-soft hover:text-brown"
                  >
                    <Star size={14} strokeWidth={1.75} /> Set default
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Address' : 'Add Address'}>
        <AddressForm value={form} onChange={setForm} errors={errors} />
        <Button fullWidth className="mt-4" loading={saving} onClick={save}>
          Save Address
        </Button>
      </Modal>
    </div>
  );
}
