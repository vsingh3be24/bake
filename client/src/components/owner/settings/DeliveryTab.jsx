import { Trash2, Plus } from 'lucide-react';
import { useSettingsDraft } from '../../../hooks/useSettingsDraft.js';
import { Input } from '../../ui/Input.jsx';
import { Switch } from '../../ui/Switch.jsx';
import { Button } from '../../ui/Button.jsx';

const FIELDS = [
  'deliveryCharge',
  'freeDeliveryAbove',
  'minOrderValue',
  'packagingCharge',
  'deliveryAreas',
  'allowPickup',
  'pickupAddress',
];

export function DeliveryTab({ settings, onSave, saving }) {
  const { draft, setField, dirty } = useSettingsDraft(settings, FIELDS);

  const updateArea = (i, patch) => {
    setField('deliveryAreas')(draft.deliveryAreas.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };
  const removeArea = (i) => {
    setField('deliveryAreas')(draft.deliveryAreas.filter((_, idx) => idx !== i));
  };
  const addArea = () => {
    setField('deliveryAreas')([...draft.deliveryAreas, { area: '', pincode: '', charge: 0, isActive: true }]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Delivery Charge (₹)"
          type="number"
          min={0}
          value={draft.deliveryCharge}
          onChange={(e) => setField('deliveryCharge')(e.target.value)}
        />
        <Input
          label="Free Delivery Above (₹)"
          type="number"
          min={0}
          value={draft.freeDeliveryAbove}
          onChange={(e) => setField('freeDeliveryAbove')(e.target.value)}
        />
        <Input
          label="Minimum Order Value (₹)"
          type="number"
          min={0}
          value={draft.minOrderValue}
          onChange={(e) => setField('minOrderValue')(e.target.value)}
        />
        <Input
          label="Packaging Charge (₹)"
          type="number"
          min={0}
          value={draft.packagingCharge}
          onChange={(e) => setField('packagingCharge')(e.target.value)}
        />
      </div>

      <Switch checked={draft.allowPickup} onChange={setField('allowPickup')} label="Allow store pickup" />
      {draft.allowPickup && (
        <Input
          label="Pickup Address"
          value={draft.pickupAddress}
          onChange={(e) => setField('pickupAddress')(e.target.value)}
        />
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-brown">Area-wise Delivery Charges</p>
        <div className="flex flex-col gap-2">
          {draft.deliveryAreas.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-[rgba(169,141,116,0.2)] p-2.5">
              <input
                value={a.area}
                onChange={(e) => updateArea(i, { area: e.target.value })}
                placeholder="Area name"
                className="min-w-[120px] flex-1 rounded-sm border border-[rgba(169,141,116,0.3)] bg-paper px-2.5 py-1.5 text-sm text-brown focus:border-maroon focus:outline-none"
              />
              <input
                value={a.pincode}
                onChange={(e) => updateArea(i, { pincode: e.target.value })}
                placeholder="Pincode"
                maxLength={6}
                className="w-24 rounded-sm border border-[rgba(169,141,116,0.3)] bg-paper px-2.5 py-1.5 text-sm text-brown focus:border-maroon focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={a.charge}
                onChange={(e) => updateArea(i, { charge: Number(e.target.value) })}
                placeholder="₹"
                className="w-20 rounded-sm border border-[rgba(169,141,116,0.3)] bg-paper px-2.5 py-1.5 text-sm text-brown focus:border-maroon focus:outline-none"
              />
              <Switch checked={a.isActive} onChange={(v) => updateArea(i, { isActive: v })} />
              <button type="button" onClick={() => removeArea(i)} className="text-brown-mute hover:text-out-stock">
                <Trash2 size={15} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="secondary" className="mt-2" type="button" onClick={addArea}>
          <Plus size={14} strokeWidth={1.75} /> Add Area
        </Button>
      </div>

      <Button className="w-fit" loading={saving} disabled={!dirty} onClick={() => onSave(draft)}>
        Save Changes
      </Button>
    </div>
  );
}
