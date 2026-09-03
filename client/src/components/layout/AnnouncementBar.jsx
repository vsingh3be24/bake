import { useSettings } from '../../hooks/useSettings.js';

export function AnnouncementBar() {
  const { settings } = useSettings();
  if (!settings?.announcementActive || !settings.announcementBar) return null;

  return (
    <div className="bg-brown px-4 py-2 text-center text-sm text-cream">{settings.announcementBar}</div>
  );
}
