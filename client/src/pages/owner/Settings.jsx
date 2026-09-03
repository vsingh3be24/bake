import { useState } from 'react';
import { useOwnerSettings } from '../../hooks/useOwnerSettings.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ShopTab } from '../../components/owner/settings/ShopTab.jsx';
import { PaymentTab } from '../../components/owner/settings/PaymentTab.jsx';
import { DeliveryTab } from '../../components/owner/settings/DeliveryTab.jsx';
import { CapacityTab } from '../../components/owner/settings/CapacityTab.jsx';
import { LoyaltyTab } from '../../components/owner/settings/LoyaltyTab.jsx';
import { ContentTab } from '../../components/owner/settings/ContentTab.jsx';
import { AccountTab } from '../../components/owner/settings/AccountTab.jsx';

const TABS = [
  { id: 'shop', label: 'Shop' },
  { id: 'payment', label: 'Payment' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'content', label: 'Content' },
  { id: 'account', label: 'Account' },
];

export function OwnerSettings() {
  const toast = useToast();
  const { settings, loading, error, refresh } = useOwnerSettings();
  const [tab, setTab] = useState('shop');
  const [saving, setSaving] = useState(false);

  const save = async (patch) => {
    setSaving(true);
    try {
      await api.patch('/owner/settings', patch);
      toast.success('Settings saved');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl text-brown">Settings</h1>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-out-stock">{error}</p>
      ) : (
        <div className="max-w-2xl">
          {tab === 'shop' && <ShopTab settings={settings} onSave={save} saving={saving} />}
          {tab === 'payment' && <PaymentTab settings={settings} onSave={save} saving={saving} />}
          {tab === 'delivery' && <DeliveryTab settings={settings} onSave={save} saving={saving} />}
          {tab === 'capacity' && <CapacityTab settings={settings} onSave={save} saving={saving} />}
          {tab === 'loyalty' && <LoyaltyTab settings={settings} onSave={save} saving={saving} />}
          {tab === 'content' && <ContentTab settings={settings} onSave={save} saving={saving} />}
          {tab === 'account' && <AccountTab />}
        </div>
      )}
    </div>
  );
}
