import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts.js';
import { useCategories } from '../../hooks/useCategories.js';
import { ProductCard } from '../../components/product/ProductCard.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'inStock', label: 'In Stock' },
  { id: 'onSale', label: 'On Sale ⚡' },
  { id: 'eggless', label: 'Eggless' },
  { id: 'sugar-free', label: 'Sugar-Free' },
  { id: 'high-protein', label: 'High Protein' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

export function Menu() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const { categories } = useCategories();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('all');
  const [sort, setSort] = useState('popular');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters = useMemo(() => {
    const f = { sort };
    if (categorySlug) f.category = categorySlug;
    if (search) f.search = search;
    if (chip === 'inStock') f.inStock = 'true';
    if (chip === 'onSale') f.onSale = 'true';
    if (['eggless', 'sugar-free', 'high-protein'].includes(chip)) f.tags = chip;
    return f;
  }, [categorySlug, search, chip, sort]);

  const { products, loading, error } = useProducts(filters);

  const categoryTabs = [
    { id: '', label: 'All Categories' },
    ...categories.map((c) => ({ id: c.slug, label: c.name })),
  ];

  return (
    <div className="container-lhh py-8">
      <h1 className="font-heading text-3xl text-brown">Menu</h1>

      <div className="mt-5 flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-mute" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search cakes, cookies..."
            className="w-full rounded-pill border border-[rgba(169,141,116,0.35)] bg-paper py-2.5 pl-10 pr-4 text-base text-brown placeholder:text-brown-mute focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)] focus:border-maroon"
          />
        </div>

        <Tabs
          tabs={categoryTabs}
          active={categorySlug || ''}
          onChange={(id) => navigate(id ? `/menu/${id}` : '/menu')}
          layoutId="category-tabs"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTER_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChip(c.id)}
                className={[
                  'rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  chip === c.id
                    ? 'border-maroon bg-maroon text-cream'
                    : 'border-[rgba(169,141,116,0.35)] text-brown-soft hover:border-maroon',
                ].join(' ')}
              >
                {c.label}
              </button>
            ))}
          </div>

          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-8">
        {error && <p className="text-out-stock">{error}</p>}

        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="Nothing found"
            message="Try adjusting your filters"
            actionLabel="Clear All Filters"
            onAction={() => {
              setChip('all');
              setSearchInput('');
              navigate('/menu');
            }}
          />
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
