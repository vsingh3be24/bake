import { Trash2, Plus } from 'lucide-react';
import { useSettingsDraft } from '../../../hooks/useSettingsDraft.js';
import { Input } from '../../ui/Input.jsx';
import { Switch } from '../../ui/Switch.jsx';
import { Button } from '../../ui/Button.jsx';

const FIELDS = ['dailyOrderCapacity', 'slots', 'minPrepHours', 'maxAdvanceDays', 'globalMinQty'];

export function CapacityTab({ settings, onSave, saving }) {
  const { draft, setField, dirty } = useSettingsDraft(settings, FIELDS);

  const updateSlot = (i, patch) => {
    setField('slots')(draft.slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const removeSlot = (i) => {
    setField('slots')(draft.slots.filter((_, idx) => idx !== i));
  };
  const addSlot = () => {
    setField('slots')([...draft.slots, { name: '', timeRange: '', capacity: 8, isActive: true }]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Daily Order Capacity"
          type="number"
          min={0}
          value={draft.dailyOrderCapacity}
          onChange={(e) => setField('dailyOrderCapacity')(e.target.value)}
        />
        <Input
          label="Min Prep Hours"
          type="number"
          min={0}
          value={draft.minPrepHours}
          onChange={(e) => setField('minPrepHours')(e.target.value)}
          helperText="Fallback for items without their own prep time (24 = 1 day ahead)"
        />
        <Input
          label="Max Advance Days"
          type="number"
          min={1}
          value={draft.maxAdvanceDays}
          onChange={(e) => setField('maxAdvanceDays')(e.target.value)}
        />
      </div>

      <Input
        label="Global Minimum Quantity"
        type="number"
        min={1}
        value={draft.globalMinQty}
        onChange={(e) => setField('globalMinQty')(e.target.value)}
        helperText="Fallback minimum order quantity for products without their own"
        className="max-w-[220px]"
      />

      <div>
        <p className="mb-2 text-sm font-medium text-brown">Delivery Slots</p>
        <div className="flex flex-col gap-2">
          {draft.slots.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-[rgba(169,141,116,0.2)] p-2.5">
              <input
                value={s.name}
                onChange={(e) => updateSlot(i, { name: e.target.value })}
                placeholder="Slot name"
                className="min-w-[100px] flex-1 rounded-sm border border-[rgba(169,141,116,0.3)] bg-paper px-2.5 py-1.5 text-sm text-brown focus:border-maroon focus:outline-none"
              />
              <input
                value={s.timeRange}
                onChange={(e) => updateSlot(i, { timeRange: e.target.value })}
                placeholder="9 AM - 1 PM"
                className="min-w-[120px] flex-1 rounded-sm border border-[rgba(169,141,116,0.3)] bg-paper px-2.5 py-1.5 text-sm text-brown focus:border-maroon focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={s.capacity}
                onChange={(e) => updateSlot(i, { capacity: Number(e.target.value) })}
                placeholder="Cap"
                className="w-16 rounded-sm border border-[rgba(169,141,116,0.3)] bg-paper px-2.5 py-1.5 text-sm text-brown focus:border-maroon focus:outline-none"
              />
              <Switch checked={s.isActive} onChange={(v) => updateSlot(i, { isActive: v })} />
              <button type="button" onClick={() => removeSlot(i)} className="text-brown-mute hover:text-out-stock">
                <Trash2 size={15} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="secondary" className="mt-2" type="button" onClick={addSlot}>
          <Plus size={14} strokeWidth={1.75} /> Add Slot
        </Button>
      </div>

      <Button className="w-fit" loading={saving} disabled={!dirty} onClick={() => onSave(draft)}>
        Save Changes
      </Button>
    </div>
  );
}
