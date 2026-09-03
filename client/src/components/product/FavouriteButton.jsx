import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';

export function FavouriteButton({ productId, className = '' }) {
  const navigate = useNavigate();
  const toast = useToast();
  const customer = useAuthStore((s) => s.customer);
  const setFavourites = useAuthStore((s) => s.setFavourites);

  const saved = Boolean(customer?.favourites?.some((id) => String(id) === String(productId)));

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!customer) {
      toast.info('Log in to save your favourites');
      navigate('/login');
      return;
    }

    try {
      const { data } = saved
        ? await api.delete(`/customer/favourites/${productId}`)
        : await api.post(`/customer/favourites/${productId}`);
      setFavourites(data.favourites);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong, please try again');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={saved}
      className={`flex h-9 w-9 items-center justify-center rounded-pill bg-[rgba(255,253,247,0.9)] text-brown-soft shadow-sm transition-colors hover:text-maroon ${className}`}
    >
      <Heart size={18} strokeWidth={1.75} fill={saved ? '#8C1D2F' : 'none'} className={saved ? 'text-maroon' : ''} />
    </button>
  );
}
