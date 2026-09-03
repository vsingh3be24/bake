import { MessageCircle, AtSign, Phone } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings.js';

export function Footer() {
  const { settings } = useSettings();
  const whatsapp = settings?.whatsappNumber || '918017853043';

  return (
    <footer className="mt-auto border-t border-[rgba(169,141,116,0.2)] bg-cream-deep pb-20 pt-10 sm:pb-10">
      <div className="container-lhh flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-2xl italic text-brown">Lucky&rsquo;s Home Harvest</p>
          <p className="mt-1 text-sm text-brown-soft">Fresh &bull; Hygienic &bull; Homemade</p>
        </div>

        <div className="flex flex-col gap-2 text-sm text-brown-soft">
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 hover:text-maroon"
          >
            <MessageCircle size={16} strokeWidth={1.75} /> Order on WhatsApp
          </a>
          <a href="tel:+918017853043" className="inline-flex items-center gap-2 hover:text-maroon">
            <Phone size={16} strokeWidth={1.75} /> +91 80178 53043
          </a>
          {settings?.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-maroon"
            >
              <AtSign size={16} strokeWidth={1.75} /> Instagram
            </a>
          )}
        </div>
      </div>
      <p className="container-lhh mt-8 text-xs text-brown-mute">
        &copy; {new Date().getFullYear()} Lucky&rsquo;s Home Harvest. All rights reserved.
      </p>
    </footer>
  );
}
