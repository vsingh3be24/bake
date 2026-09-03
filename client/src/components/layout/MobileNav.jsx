import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UtensilsCrossed, Zap, ShoppingBag, PackageSearch } from 'lucide-react';
import { useCartCount } from '../../store/cartStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { CartDrawer } from './CartDrawer.jsx';

const navItemClass = ({ isActive }) =>
  `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
    isActive ? 'text-maroon' : 'text-brown-soft'
  }`;

export function MobileNav() {
  const [cartOpen, setCartOpen] = useState(false);
  const count = useCartCount();
  const customer = useAuthStore((s) => s.customer);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[rgba(169,141,116,0.2)] bg-paper sm:hidden"
        style={{ height: 'var(--mobile-nav-h)' }}
      >
        <NavLink to="/menu" className={navItemClass}>
          <UtensilsCrossed size={20} strokeWidth={1.75} />
          Menu
        </NavLink>

        <NavLink to="/offers" className={navItemClass}>
          <Zap size={20} strokeWidth={1.75} />
          Offers
        </NavLink>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium text-brown-soft"
        >
          <ShoppingBag size={20} strokeWidth={1.75} />
          Cart
          {count > 0 && (
            <span className="absolute right-[22%] top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-pill bg-maroon px-1 text-[10px] font-semibold text-cream">
              {count}
            </span>
          )}
        </button>

        <NavLink to={customer ? '/me/orders' : '/login'} className={navItemClass}>
          <PackageSearch size={20} strokeWidth={1.75} />
          My Orders
        </NavLink>
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
