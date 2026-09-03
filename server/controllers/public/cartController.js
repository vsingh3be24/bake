import { validateCartItems } from '../../services/cartService.js';
import { getSettings } from '../../services/settingsService.js';
import { AppError } from '../../utils/AppError.js';

export async function validateCart(req, res) {
  const { items } = req.body;
  if (!Array.isArray(items)) throw new AppError('Cart items are required');

  const settings = await getSettings();

  if (items.length === 0) {
    return res.json({
      items: [],
      itemsTotal: 0,
      hasIssues: false,
      deliveryCharge: 0,
      freeDeliveryAbove: settings.freeDeliveryAbove,
      packagingCharge: settings.packagingCharge,
      minOrderValue: settings.minOrderValue,
    });
  }

  const result = await validateCartItems(items);
  const deliveryCharge = result.itemsTotal >= settings.freeDeliveryAbove ? 0 : settings.deliveryCharge;

  res.json({
    ...result,
    deliveryCharge,
    freeDeliveryAbove: settings.freeDeliveryAbove,
    packagingCharge: settings.packagingCharge,
    minOrderValue: settings.minOrderValue,
  });
}
