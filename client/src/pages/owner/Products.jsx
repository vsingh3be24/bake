import { useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw, Zap } from 'lucide-react';
import { useOwnerProducts } from '../../hooks/useOwnerProducts.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { ProductImage } from '../../components/product/ProductImage.jsx';
import { ProductForm } from '../../components/owner/ProductForm.jsx';
import { formatRupees } from '../../lib/format.js';

export function OwnerProducts() {
  const toast = useToast();
  const { products, loading, error, refresh } = useOwnerProducts({ includeArchived: true });
  const [modal, setModal] = useState(null); // null | 'create' | product being edited
  const [busyId, setBusyId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (modal && modal !== 'create') {
        await api.patch(`/owner/products/${modal._id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/owner/products', payload);
        toast.success('Product added');
      }
      setModal(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (product) => {
    if (!window.confirm(`Remove "${product.name}" from the menu? You can restore it later.`)) return;
    setBusyId(product._id);
    try {
      await api.delete(`/owner/products/${product._id}`);
      toast.success('Product removed from the menu');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove the product');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (product) => {
    setBusyId(product._id);
    try {
      await api.patch(`/owner/products/${product._id}/restore`);
      toast.success('Product restored');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not restore the product');
    } finally {
      setBusyId(null);
    }
  };

  const active = products.filter((p) => p.isActive);
  const archived = products.filter((p) => !p.isActive);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-brown">Products</h1>
        <Button size="sm" onClick={() => setModal('create')}>
          <Plus size={14} strokeWidth={1.75} /> Add Product
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-out-stock">{error}</p>
      ) : active.length === 0 ? (
        <EmptyState title="No products yet" message="Add your first item to get it onto the menu." actionLabel="Add Product" onAction={() => setModal('create')} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {active.map((p) => (
            <div key={p._id} className="flex flex-col overflow-hidden rounded-md border border-[rgba(169,141,116,0.2)] bg-paper">
              <div className="relative aspect-square bg-cream-deep">
                <ProductImage product={p} className="h-full w-full" />
                {p.isHotSelling && (
                  <span className="absolute left-2 top-2">
                    <Badge variant="sale"><Zap size={10} strokeWidth={2} className="inline" /> Hot</Badge>
                  </span>
                )}
                {!p.isVisible && (
                  <span className="absolute right-2 top-2 rounded-pill bg-[rgba(74,44,26,0.75)] px-2 py-0.5 text-[10px] font-medium text-cream">
                    Hidden
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="font-medium text-brown line-clamp-1">{p.name}</p>
                <p className="text-xs text-brown-mute">{p.category?.name}</p>
                <p className="mt-1 text-sm font-semibold text-brown">
                  {p.hasVariants ? `From ${formatRupees(Math.min(...p.variants.map((v) => v.salePrice ?? v.price)))}` : formatRupees(p.salePrice ?? p.price)}
                </p>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => setModal(p)}>
                    <Pencil size={13} strokeWidth={1.75} /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" loading={busyId === p._id} onClick={() => handleArchive(p)}>
                    <Archive size={13} strokeWidth={1.75} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-3 font-heading text-lg text-brown-soft">Archived ({archived.length})</h2>
          <div className="flex flex-col gap-2">
            {archived.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 rounded-md border border-[rgba(169,141,116,0.2)] bg-cream-deep p-3">
                <span className="text-sm text-brown-soft">{p.name}</span>
                <Button size="sm" variant="secondary" loading={busyId === p._id} onClick={() => handleRestore(p)}>
                  <RotateCcw size={13} strokeWidth={1.75} /> Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal && modal !== 'create' ? 'Edit Product' : 'Add Product'}>
        <ProductForm
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
