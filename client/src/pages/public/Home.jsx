import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, ShieldCheck, Home as HomeIcon, HeartHandshake, MessageCircle } from 'lucide-react';
import { useHotSelling } from '../../hooks/useHotSelling.js';
import { useCategories } from '../../hooks/useCategories.js';
import { useOffers } from '../../hooks/useOffers.js';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import { ProductCard } from '../../components/product/ProductCard.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Reveal } from '../../components/motion/Reveal.jsx';
import { Stagger } from '../../components/motion/Stagger.jsx';
import { Marquee } from '../../components/motion/Marquee.jsx';
import { getCategoryIcon } from '../../lib/categoryIcons.js';

const WHY_LUCKYS = [
  { icon: Leaf, title: 'No Preservatives', desc: 'Only fresh, natural ingredients' },
  { icon: HeartHandshake, title: 'Wholesome', desc: 'Home-style recipes, made with love' },
  { icon: HomeIcon, title: 'Homemade', desc: 'Every order straight from our kitchen' },
  { icon: ShieldCheck, title: 'Hygienic', desc: 'Clean packaging, safe delivery' },
];

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.2 } },
};

const heroLetter = {
  hidden: { y: 60, opacity: 0, rotate: -8 },
  show: { y: 0, opacity: 1, rotate: 0, transition: { type: 'spring', damping: 12, stiffness: 200 } },
};

function HeroTitle() {
  const { reduce } = useReducedMotion();
  const text = "Lucky's Home Harvest";

  if (reduce) {
    return <h1 className="font-display text-4xl italic text-brown sm:text-6xl">{text}</h1>;
  }

  return (
    <motion.h1
      variants={heroContainer}
      initial="hidden"
      animate="show"
      className="font-display text-4xl italic text-brown sm:text-6xl"
    >
      {text.split('').map((c, i) => (
        <motion.span key={i} variants={heroLetter} className="inline-block">
          {c === ' ' ? ' ' : c}
        </motion.span>
      ))}
    </motion.h1>
  );
}

export function Home() {
  const { products: hotSelling, loading: hotLoading } = useHotSelling();
  const { categories, loading: catLoading } = useCategories();
  const { offers, loading: offersLoading } = useOffers();

  return (
    <div>
      <section className="container-lhh flex flex-col items-center gap-4 py-16 text-center sm:py-24">
        <HeroTitle />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="text-lg tracking-wide text-brown-soft"
        >
          Fresh &bull; Hygienic &bull; Homemade
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.6 }}>
          <Button as={Link} to="/menu" size="lg" className="mt-2">
            Order Now
          </Button>
        </motion.div>
      </section>

      {hotLoading ? (
        <section className="py-8">
          <h2 className="container-lhh font-heading text-2xl text-brown">🔥 Hot Selling</h2>
          <div className="container-lhh mt-5 flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-64 shrink-0" />
            ))}
          </div>
        </section>
      ) : (
        hotSelling.length > 0 && (
          <Reveal>
            <section className="py-8">
              <h2 className="container-lhh font-heading text-2xl text-brown">🔥 Hot Selling</h2>
              <Marquee className="mt-5" duration={hotSelling.length * 6}>
                {hotSelling.map((p) => (
                  <div key={p._id} className="w-64 shrink-0">
                    <ProductCard product={p} />
                  </div>
                ))}
              </Marquee>
            </section>
          </Reveal>
        )
      )}

      <Reveal delay={0.05}>
        <section className="container-lhh py-8">
          <h2 className="font-heading text-2xl text-brown">Shop by Category</h2>
          {catLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <Stagger className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.icon);
                return (
                  <Link key={cat._id} to={`/menu/${cat.slug}`}>
                    <Card hoverable className="flex flex-col items-center gap-2 p-6 text-center">
                      <Icon size={28} strokeWidth={1.5} className="text-maroon" />
                      <span className="font-medium text-brown">{cat.name}</span>
                    </Card>
                  </Link>
                );
              })}
            </Stagger>
          )}
        </section>
      </Reveal>

      {offersLoading ? (
        <section className="container-lhh py-8">
          <h2 className="font-heading text-2xl text-brown">⚡ Today&rsquo;s Offers</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </section>
      ) : (
        offers.length > 0 && (
          <Reveal delay={0.1}>
            <section className="container-lhh py-8">
              <h2 className="font-heading text-2xl text-brown">⚡ Today&rsquo;s Offers</h2>
              <Stagger className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {offers.map((offer) => (
                  <Card key={offer._id} className="flex flex-col gap-2 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-xl text-brown">{offer.title}</h3>
                      {offer.badgeText && <Badge variant="sale">{offer.badgeText}</Badge>}
                    </div>
                    {offer.subtitle && <p className="text-sm text-brown-soft">{offer.subtitle}</p>}
                    {offer.code && <p className="text-xs text-brown-mute">Code: {offer.code}</p>}
                  </Card>
                ))}
              </Stagger>
            </section>
          </Reveal>
        )
      )}

      <Reveal delay={0.1}>
        <section className="container-lhh py-10">
          <h2 className="font-heading text-2xl text-brown">Why Lucky&rsquo;s</h2>
          <Stagger className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {WHY_LUCKYS.map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-cream-deep">
                  <item.icon size={24} strokeWidth={1.5} className="text-olive" />
                </div>
                <p className="font-medium text-brown">{item.title}</p>
                <p className="text-sm text-brown-soft">{item.desc}</p>
              </div>
            ))}
          </Stagger>
        </section>
      </Reveal>

      <Reveal>
        <section className="container-lhh flex justify-center py-10">
          <a
            href="https://wa.me/918017853043"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-pill bg-olive px-6 py-3 font-medium text-cream transition-colors hover:brightness-95"
          >
            <MessageCircle size={18} strokeWidth={1.75} />
            Order on WhatsApp
          </a>
        </section>
      </Reveal>
    </div>
  );
}
