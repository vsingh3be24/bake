import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useSettingsDraft } from '../../../hooks/useSettingsDraft.js';
import { Input } from '../../ui/Input.jsx';
import { Switch } from '../../ui/Switch.jsx';
import { Button } from '../../ui/Button.jsx';

// shopOpen is excluded from the batched draft below — it's the master
// switch, and matches the Dashboard's identical toggle: flipping it must
// take effect immediately, not sit invisibly until "Save Changes" is clicked.
const FIELDS = ['closedMessage', 'autoCloseTime', 'autoOpenTime', 'holidays'];

function dateLabel(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ShopTab({ settings, onSave, saving }) {
  const { draft, setField, dirty } = useSettingsDraft(settings, FIELDS);
  const [newHoliday, setNewHoliday] = useState('');
  const [togglingShop, setTogglingShop] = useState(false);

  const toggleShopOpen = async (open) => {
    setTogglingShop(true);
    try {
      await onSave({ shopOpen: open });
    } finally {
      setTogglingShop(false);
    }
  };

  const addHoliday = () => {
    if (!newHoliday) return;
    const key = new Date(newHoliday).toISOString().slice(0, 10);
    if (draft.holidays.some((h) => new Date(h).toISOString().slice(0, 10) === key)) return;
    setField('holidays')([...draft.holidays, newHoliday]);
    setNewHoliday('');
  };

  const removeHoliday = (iso) => {
    setField('holidays')(draft.holidays.filter((h) => h !== iso));
  };

  return (
    <div className="flex flex-col gap-5">
      <Switch
        checked={settings.shopOpen}
        onChange={toggleShopOpen}
        disabled={togglingShop}
        label={settings.shopOpen ? 'Shop is open' : 'Shop is closed'}
      />

      <Input
        label="Closed Message"
        value={draft.closedMessage}
        onChange={(e) => setField('closedMessage')(e.target.value)}
        helperText="Shown to customers when the shop is closed"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Auto-Open Time"
          type="time"
          value={draft.autoOpenTime}
          onChange={(e) => setField('autoOpenTime')(e.target.value)}
        />
        <Input
          label="Auto-Close Time"
          type="time"
          value={draft.autoCloseTime}
          onChange={(e) => setField('autoCloseTime')(e.target.value)}
          helperText="Orders stop being accepted after this time"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-brown">Holidays</p>
        <div className="flex flex-wrap gap-2">
          {draft.holidays.map((h) => (
            <span
              key={h}
              className="flex items-center gap-1.5 rounded-pill bg-cream-deep px-3 py-1.5 text-sm text-brown-soft"
            >
              {dateLabel(h)}
              <button type="button" onClick={() => removeHoliday(h)} aria-label="Remove holiday">
                <X size={13} strokeWidth={2} />
              </button>
            </span>
          ))}
          {draft.holidays.length === 0 && <p className="text-sm text-brown-mute">No holidays set</p>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={newHoliday}
            onChange={(e) => setNewHoliday(e.target.value)}
            className="rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-3 py-2 text-sm text-brown focus:border-maroon focus:outline-none"
          />
          <Button size="sm" variant="secondary" type="button" onClick={addHoliday} disabled={!newHoliday}>
            <Plus size={14} strokeWidth={1.75} /> Add
          </Button>
        </div>
      </div>

      <Button className="w-fit" loading={saving} disabled={!dirty} onClick={() => onSave(draft)}>
        Save Changes
      </Button>
    </div>
  );
}
