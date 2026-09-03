import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Cookie,
  Zap,
  ChefHat,
  ClipboardList,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useOwnerStore } from '../../store/ownerStore.js';
import { useOwnerOrderBadge } from '../../hooks/useOwnerOrderBadge.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { NotificationBell } from '../layout/NotificationBell.jsx';

const NAV = [
  { to: '/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/owner/orders', label: 'Orders', icon: Package, badge: 'orders' },
  { to: '/owner/products', label: 'Products', icon: Cookie },
  { to: '/owner/stock', label: 'Stock', icon: Package },
  { to: '/owner/offers', label: 'Offers', icon: Zap },
  { to: '/owner/queue', label: 'Kitchen Queue', icon: ChefHat },
  { to: '/owner/baking-list', label: 'Baking List', icon: ClipboardList },
  { to: '/owner/customers', label: 'Customers', icon: Users },
  { to: '/owner/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/owner/settings', label: 'Settings', icon: Settings },
];

// Only these are built out this phase — the rest of NAV renders (matching
// the spec's full sidebar) but leads nowhere useful yet, so it's clearly
// marked instead of looking broken.
const LIVE_ROUTES = new Set([
  '/owner',
  '/owner/orders',
  '/owner/stock',
  '/owner/offers',
  '/owner/queue',
  '/owner/baking-list',
  '/owner/customers',
  '/owner/settings',
  '/owner/analytics',
]);

const MOBILE_NAV = NAV.filter((item) => LIVE_ROUTES.has(item.to));

export function OwnerLayout() {
  const navigate = useNavigate();
  const owner = useOwnerStore((s) => s.owner);
  const logout = useOwnerStore((s) => s.logout);
  const newOrderCount = useOwnerOrderBadge();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications('owner');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [navigate]);

  const doLogout = async () => {
    await logout();
    navigate('/owner/login');
  };

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[rgba(169,141,116,0.2)] bg-paper md:flex">
        <div className="flex items-start justify-between px-5 py-6">
          <div>
            <p className="font-heading text-xl text-brown">Lucky's Home Harvest</p>
            <p className="text-xs text-brown-mute">Owner Dashboard</p>
          </div>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
          />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((item) => {
            const live = LIVE_ROUTES.has(item.to);
            const badgeCount = item.badge === 'orders' ? newOrderCount : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[rgba(140,29,47,0.08)] text-maroon'
                      : live
                      ? 'text-brown-soft hover:bg-[rgba(74,44,26,0.06)]'
                      : 'text-brown-mute hover:bg-[rgba(74,44,26,0.06)]',
                  ].join(' ')
                }
              >
                <item.icon size={18} strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="rounded-pill bg-maroon px-2 py-0.5 text-xs font-semibold text-cream">
                    {badgeCount}
                  </span>
                )}
                {!live && <span className="text-[10px] text-brown-mute">soon</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-[rgba(169,141,116,0.2)] p-3">
          <div className="px-3 py-1.5 text-sm text-brown-soft">{owner?.name || 'Owner'}</div>
          <button
            type="button"
            onClick={doLogout}
            className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-medium text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)]"
          >
            <LogOut size={18} strokeWidth={1.75} /> Log Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[rgba(169,141,116,0.2)] bg-paper px-4 py-3 md:hidden">
        <p className="font-heading text-lg text-brown">Owner Dashboard</p>
        <div className="flex items-center gap-1">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
          />
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="text-brown">
            <Menu size={22} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)]" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-64 flex-col bg-paper p-4">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="mb-4 self-end text-brown"
            >
              <X size={22} strokeWidth={1.75} />
            </button>
            <nav className="flex flex-col gap-0.5">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-[rgba(140,29,47,0.08)] text-maroon' : 'text-brown-soft',
                    ].join(' ')
                  }
                >
                  <item.icon size={18} strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              onClick={doLogout}
              className="mt-auto flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-medium text-brown-soft"
            >
              <LogOut size={18} strokeWidth={1.75} /> Log Out
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-20 pt-14 md:pb-0 md:pt-0">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav — scrolls horizontally rather than squeezing items
          as more live screens get added, so each stays a comfortable tap target. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-[rgba(169,141,116,0.2)] bg-paper md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex w-16 shrink-0 flex-col items-center gap-1 py-2.5 text-xs font-medium',
                isActive ? 'text-maroon' : 'text-brown-soft',
              ].join(' ')
            }
          >
            <item.icon size={20} strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
