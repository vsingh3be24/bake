import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, User } from 'lucide-react';
import { useCartCount } from '../../store/cartStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { CartDrawer } from './CartDrawer.jsx';
import { NotificationBell } from './NotificationBell.jsx';

const links = [
  { to: '/menu', label: 'Menu' },
  { to: '/offers', label: 'Offers' },
  { to: '/track', label: 'Track' },
];

export function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const count = useCartCount();
  const customer = useAuthStore((s) => s.customer);
  const { reduce } = useReducedMotion();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications('customer', Boolean(customer));

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(169,141,116,0.2)] bg-[rgba(253,246,233,0.95)] backdrop-blur-sm">
      <div className="container-lhh flex h-16 items-center justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
          {logoOk && (
            <img
              src="/logo.png"
              alt=""
              onError={() => setLogoOk(false)}
              className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
            />
          )}
          <span className="whitespace-nowrap font-display text-base italic text-brown sm:text-2xl">
            Lucky&rsquo;s Home Harvest
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-maroon' : 'text-brown-soft hover:text-brown'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {customer && (
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
          )}

          <Link
            to={customer ? '/me' : '/login'}
            aria-label={customer ? 'My Account' : 'Login'}
            className="flex h-10 w-10 items-center justify-center rounded-pill text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)]"
          >
            <User size={20} strokeWidth={1.75} />
          </Link>

          <button
            type="button"
            id="cart-icon"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-pill text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)]"
          >
            <ShoppingBag size={22} strokeWidth={1.75} />
            {count > 0 && (
              <motion.span
                key={reduce ? 'static' : count}
                initial={reduce ? false : { scale: 1 }}
                animate={reduce ? {} : { scale: [1, 1.4, 1] }}
                transition={{ duration: 0.35 }}
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-pill bg-maroon px-1 text-xs font-semibold text-cream"
              >
                {count}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
