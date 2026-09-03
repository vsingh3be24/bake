import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout.jsx';
import { CustomerLayout } from './components/layout/CustomerLayout.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { OwnerProtectedRoute } from './components/layout/OwnerProtectedRoute.jsx';
import { OwnerLayout } from './components/owner/OwnerLayout.jsx';
import { useAuthStore } from './store/authStore.js';
import { useOwnerStore } from './store/ownerStore.js';
import { Home } from './pages/public/Home.jsx';
import { Menu } from './pages/public/Menu.jsx';
import { ProductDetail } from './pages/public/ProductDetail.jsx';
import { Cart } from './pages/public/Cart.jsx';
import { Checkout } from './pages/public/Checkout.jsx';
import { OrderSuccess } from './pages/public/OrderSuccess.jsx';
import { Login } from './pages/public/Login.jsx';
import { Signup } from './pages/public/Signup.jsx';
import { ComingSoon } from './pages/public/ComingSoon.jsx';
import { Offers } from './pages/public/Offers.jsx';
import { Dashboard } from './pages/customer/Dashboard.jsx';
import { Orders } from './pages/customer/Orders.jsx';
import { OrderDetail } from './pages/customer/OrderDetail.jsx';
import { Favourites } from './pages/customer/Favourites.jsx';
import { Addresses } from './pages/customer/Addresses.jsx';
import { Rewards } from './pages/customer/Rewards.jsx';
import { Profile } from './pages/customer/Profile.jsx';
import { OwnerLogin } from './pages/owner/Login.jsx';
import { OwnerDashboard } from './pages/owner/Dashboard.jsx';
import { OwnerOrders } from './pages/owner/Orders.jsx';
import { OwnerOrderDetail } from './pages/owner/OrderDetail.jsx';
import { OwnerProducts } from './pages/owner/Products.jsx';
import { OwnerStock } from './pages/owner/Stock.jsx';
import { OwnerOffers } from './pages/owner/Offers.jsx';
import { OwnerQueue } from './pages/owner/Queue.jsx';
import { OwnerCustomers } from './pages/owner/Customers.jsx';
import { OwnerSettings } from './pages/owner/Settings.jsx';
import { Track } from './pages/public/Track.jsx';
import { OwnerCustomerDetail } from './pages/owner/CustomerDetail.jsx';
import { OwnerBakingList } from './pages/owner/BakingList.jsx';

// Analytics pulls in Recharts (~400KB) for one owner-only screen — code-split
// so a customer browsing the menu never downloads a charting library.
const OwnerAnalytics = lazy(() =>
  import('./pages/owner/Analytics.jsx').then((m) => ({ default: m.OwnerAnalytics }))
);

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const fetchOwnerMe = useOwnerStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
    fetchOwnerMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/menu/:categorySlug" element={<Menu />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success/:orderId" element={<OrderSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/me"
          element={
            <ProtectedRoute>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="favourites" element={<Favourites />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="/offers" element={<Offers />} />
        <Route path="/track" element={<Track />} />
        <Route path="/about" element={<ComingSoon title="About Us" />} />
        <Route path="/contact" element={<ComingSoon title="Contact Us" />} />
        <Route path="*" element={<ComingSoon title="Page Not Found" />} />
      </Route>

      {/* Owner dashboard lives outside the customer <Layout> — no Navbar/Footer/MobileNav. */}
      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route
        path="/owner"
        element={
          <OwnerProtectedRoute>
            <OwnerLayout />
          </OwnerProtectedRoute>
        }
      >
        <Route index element={<OwnerDashboard />} />
        <Route path="orders" element={<OwnerOrders />} />
        <Route path="orders/:id" element={<OwnerOrderDetail />} />
        <Route path="products" element={<OwnerProducts />} />
        <Route path="stock" element={<OwnerStock />} />
        <Route path="offers" element={<OwnerOffers />} />
        <Route path="queue" element={<OwnerQueue />} />
        <Route path="baking-list" element={<OwnerBakingList />} />
        <Route path="customers" element={<OwnerCustomers />} />
        <Route path="customers/:id" element={<OwnerCustomerDetail />} />
        <Route
          path="analytics"
          element={
            <Suspense fallback={<div className="py-12 text-center text-sm text-brown-mute">Loading analytics…</div>}>
              <OwnerAnalytics />
            </Suspense>
          }
        />
        <Route path="settings" element={<OwnerSettings />} />
      </Route>
    </Routes>
  );
}

export default App;
