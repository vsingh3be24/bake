import { useSettingsDraft } from '../../../hooks/useSettingsDraft.js';
import { Input } from '../../ui/Input.jsx';
import { Switch } from '../../ui/Switch.jsx';
import { Button } from '../../ui/Button.jsx';

const FIELDS = ['announcementBar', 'announcementActive', 'whatsappNumber', 'instagramUrl', 'aboutText'];

export function ContentTab({ settings, onSave, saving }) {
  const { draft, setField, dirty } = useSettingsDraft(settings, FIELDS);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Switch checked={draft.announcementActive} onChange={setField('announcementActive')} label="Show announcement bar" />
        {draft.announcementActive && (
          <Input
            className="mt-3"
            label="Announcement Text"
            value={draft.announcementBar}
            onChange={(e) => setField('announcementBar')(e.target.value)}
            placeholder="Free delivery this weekend!"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="WhatsApp Number"
          value={draft.whatsappNumber}
          onChange={(e) => setField('whatsappNumber')(e.target.value)}
          placeholder="918017853043"
          helperText="Country code + number, no + or spaces"
        />
        <Input
          label="Instagram URL"
          value={draft.instagramUrl}
          onChange={(e) => setField('instagramUrl')(e.target.value)}
          placeholder="https://instagram.com/luckyshomeharvest"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-brown">About Text</label>
        <textarea
          value={draft.aboutText}
          onChange={(e) => setField('aboutText')(e.target.value)}
          rows={4}
          className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-3.5 py-2.5 text-base text-brown placeholder:text-brown-mute focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)] focus:border-maroon"
        />
      </div>

      <Button className="w-fit" loading={saving} disabled={!dirty} onClick={() => onSave(draft)}>
        Save Changes
      </Button>
    </div>
  );
}
