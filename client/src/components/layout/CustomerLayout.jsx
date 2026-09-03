import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/me', label: 'Overview', end: true },
  { to: '/me/orders', label: 'Orders' },
  { to: '/me/favourites', label: 'Favourites' },
  { to: '/me/addresses', label: 'Addresses' },
  { to: '/me/rewards', label: 'Rewards' },
  { to: '/me/profile', label: 'Profile' },
];

export function CustomerLayout() {
  return (
    <div className="container-lhh py-8">
      <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-[rgba(169,141,116,0.25)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'border-maroon text-maroon' : 'border-transparent text-brown-soft hover:text-brown'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
