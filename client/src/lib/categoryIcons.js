import { Cake, Cookie, Leaf, Croissant, Gift, UtensilsCrossed } from 'lucide-react';

export const CATEGORY_ICONS = {
  cake: Cake,
  cookie: Cookie,
  leaf: Leaf,
  croissant: Croissant,
  gift: Gift,
};

export function getCategoryIcon(icon) {
  return CATEGORY_ICONS[icon] || UtensilsCrossed;
}
