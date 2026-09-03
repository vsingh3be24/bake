import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useOwnerOffers } from '../../hooks/useOwnerOffers.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { OfferCard } from '../../components/owner/OfferCard.jsx';
import { OfferForm } from '../../components/owner/OfferForm.jsx';

const TABS = [
  { id: 'live', label: 'Live' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'expired', label: 'Expired' },
  { id: 'draft', label: 'Draft' },
];

export function OwnerOffers() {
  const toast = useToast();
  const { offers, loading, error, refresh } = useOwnerOffers();

  const [tab, setTab] = useState('live');
  const [modal, setModal] = useState(null); // null | 'create' | offer object being edited
  const [busyId, setBusyId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const counts = useMemo(() => {
    const c = { live: 0, scheduled: 0, expired: 0, draft: 0 };
    for (const o of offers) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [offers]);

  const tabsWithCounts = TABS.map((t) => ({ ...t, count: counts[t.id] }));
  const visible = offers.filter((o) => o.status === tab).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleToggle = async (offer) => {
    setBusyId(offer._id);
    try {
      await api.patch(`/owner/offers/${offer._id}/toggle`);
      toast.success(offer.isActive ? 'Offer paused' : 'Offer resumed');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the offer');
    } finally {
      setBusyId(null);
    }
  };

  const handleExtend = async (offer, hours) => {
    setBusyId(offer._id);
    try {
      await api.patch(`/owner/offers/${offer._id}/extend`, { hours });
      toast.success(`Extended by ${hours}hrs`);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not extend the offer');
    } finally {
      setBusyId(null);
    }
  };

  const handleEndNow = async (offer) => {
    setBusyId(offer._id);
    try {
      await api.patch(`/owner/offers/${offer._id}`, { endAt: new Date().toISOString() });
      toast.success('Offer ended');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not end the offer');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Delete "${offer.title}"? This can't be undone.`)) return;
    setBusyId(offer._id);
    try {
      await api.delete(`/owner/offers/${offer._id}`);
      toast.success('Offer deleted');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the offer');
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (modal && modal !== 'create') {
        await api.patch(`/owner/offers/${modal._id}`, payload);
        toast.success('Offer updated');
      } else {
        await api.post('/owner/offers', payload);
        toast.success('Offer launched');
      }
      setModal(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-brown">Offers</h1>
        <Button size="sm" onClick={() => setModal('create')}>
          <Plus size={14} strokeWidth={1.75} /> Create Offer
        </Button>
      </div>

      <Tabs tabs={tabsWithCounts} active={tab} onChange={setTab} />

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-out-stock">{error}</p>
      ) : visible.length === 0 ? (
        <EmptyState title={`No ${tab} offers`} message="Create one to get started." actionLabel="Create Offer" onAction={() => setModal('create')} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((offer) => (
            <OfferCard
              key={offer._id}
              offer={offer}
              busy={busyId === offer._id}
              onToggle={handleToggle}
              onExtend={handleExtend}
              onEndNow={handleEndNow}
              onEdit={(o) => setModal(o)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal && modal !== 'create' ? 'Edit Offer' : 'Create Offer'}>
        <OfferForm
          key={modal && modal !== 'create' ? modal._id : 'create'}
          initial={modal && modal !== 'create' ? modal : null}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
