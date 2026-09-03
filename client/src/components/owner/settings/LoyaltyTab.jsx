import { useSettingsDraft } from '../../../hooks/useSettingsDraft.js';
import { Input } from '../../ui/Input.jsx';
import { Switch } from '../../ui/Switch.jsx';
import { Button } from '../../ui/Button.jsx';

const FIELDS = ['loyaltyEnabled', 'pointsPerHundred', 'pointValue', 'minPointsToRedeem'];

export function LoyaltyTab({ settings, onSave, saving }) {
  const { draft, setField, dirty } = useSettingsDraft(settings, FIELDS);

  return (
    <div className="flex flex-col gap-5">
      <Switch checked={draft.loyaltyEnabled} onChange={setField('loyaltyEnabled')} label="Enable loyalty points" />

      {draft.loyaltyEnabled && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Points per ₹100"
            type="number"
            min={0}
            value={draft.pointsPerHundred}
            onChange={(e) => setField('pointsPerHundred')(e.target.value)}
          />
          <Input
            label="Point Value (₹)"
            type="number"
            min={0}
            step="0.1"
            value={draft.pointValue}
            onChange={(e) => setField('pointValue')(e.target.value)}
            helperText="Rupee value of 1 point when redeemed"
          />
          <Input
            label="Minimum Points to Redeem"
            type="number"
            min={0}
            value={draft.minPointsToRedeem}
            onChange={(e) => setField('minPointsToRedeem')(e.target.value)}
          />
        </div>
      )}

      <Button className="w-fit" loading={saving} disabled={!dirty} onClick={() => onSave(draft)}>
        Save Changes
      </Button>
    </div>
  );
}
