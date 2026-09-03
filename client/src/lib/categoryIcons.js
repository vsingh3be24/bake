import { Cake, Cookie, Leaf, Croissant, Gift, EggOff, UtensilsCrossed } from 'lucide-react';

export const CATEGORY_ICONS = {
  cake: Cake,
  cookie: Cookie,
  leaf: Leaf,
  croissant: Croissant,
  gift: Gift,
  'egg-off': EggOff,
};

export function getCategoryIcon(icon) {
  return CATEGORY_ICONS[icon] || UtensilsCrossed;
}
