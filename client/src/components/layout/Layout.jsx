import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AnnouncementBar } from './AnnouncementBar.jsx';
import { FlashBar } from './FlashBar.jsx';
import { Navbar } from './Navbar.jsx';
import { Footer } from './Footer.jsx';
import { MobileNav } from './MobileNav.jsx';
import { useLenis } from '../../hooks/useLenis.js';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

export function Layout() {
  useLenis();
  const location = useLocation();
  const { reduce, duration } = useReducedMotion(0.3);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <AnnouncementBar />
      <FlashBar />
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -12 }}
            transition={{ duration }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
