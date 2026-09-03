import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, ShoppingBag } from 'lucide-react';
import { Drawer } from '../ui/Drawer.jsx';
import { Stepper } from '../ui/Stepper.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Button } from '../ui/Button.jsx';
import { useCartStore, useCartSubtotal } from '../../store/cartStore.js';
import { formatRupees } from '../../lib/format.js';

export function CartDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartSubtotal();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Your Cart"
      footer={
        items.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-brown-soft">Subtotal</span>
              <span className="text-xl font-semibold tabular-nums text-brown">{formatRupees(subtotal)}</span>
            </div>
            <Button
              fullWidth
              onClick={() => {
                onClose();
                navigate('/cart');
              }}
            >
              View Cart & Checkout
            </Button>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Add something tasty!"
          actionLabel="Browse Menu"
          onAction={onClose}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3 overflow-hidden border-b border-[rgba(169,141,116,0.15)] pb-4"
              >
                <div className="h-16 w-16 shrink-0 rounded-sm bg-cream-deep">
                  {item.image && <img src={item.image} alt={item.name} className="h-full w-full rounded-sm object-cover" />}
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-brown">{item.name}</p>
                      {item.variantLabel && <p className="text-xs text-brown-mute">{item.variantLabel}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      aria-label={`Remove ${item.name}`}
                      className="text-brown-mute hover:text-out-stock"
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Stepper
                      value={item.qty}
                      onChange={(qty) => updateQty(item.key, qty)}
                      min={item.minQty}
                      max={item.maxQty}
                      step={item.stepQty}
                    />
                    <span className="font-semibold tabular-nums text-brown">{formatRupees(item.qty * item.price)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Drawer>
  );
}
