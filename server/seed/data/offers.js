export function buildOffers(categoryIdBySlug) {
  return [
    {
      title: 'First Order 10%',
      subtitle: 'For new customers',
      type: 'percent',
      value: 10,
      maxDiscount: 100,
      minOrderValue: 0,
      appliesTo: 'all',
      firstOrderOnly: true,
      isAutoApply: true,
      isStackable: true, // welcome perks are meant to combine
      priority: 5,
      isActive: true,
      badgeText: '10% OFF',
    },
    {
      title: 'Free Delivery ₹499+',
      subtitle: 'Delivery is completely free',
      type: 'free_delivery',
      minOrderValue: 499,
      appliesTo: 'cart_total',
      isAutoApply: true,
      isStackable: true, // free delivery always stacks on top
      priority: 3,
      isActive: true,
      badgeText: 'FREE Delivery',
    },
    {
      title: 'Weekend Flash 15%',
      subtitle: 'Weekend mornings only',
      type: 'percent',
      value: 15,
      maxDiscount: 150,
      minOrderValue: 299,
      appliesTo: 'all',
      isFlash: true,
      isRecurring: true,
      recurDays: [0, 6], // Sun, Sat
      recurStartTime: '09:00',
      recurEndTime: '13:00',
      showCountdown: true,
      flashBannerText: '⚡ Weekend Flash — 15% OFF',
      isActive: true,
      badgeText: '15% OFF',
    },
    {
      title: 'Buy 4 Get 1 Cookies',
      subtitle: 'On all cookies',
      type: 'bogo',
      value: 1,
      appliesTo: 'category',
      targetIds: [categoryIdBySlug.cookies],
      minOrderValue: 0,
      isAutoApply: true,
      isStackable: true, // combines with the welcome discount + free delivery
      priority: 4,
      isActive: true,
      badgeText: 'Buy 4 Get 1',
    },
  ];
}
