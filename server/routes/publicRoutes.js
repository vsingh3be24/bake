import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { listProducts, getProductBySlug, getHotSelling } from '../controllers/public/productController.js';
import { listCategories } from '../controllers/public/categoryController.js';
import { getPublicSettings } from '../controllers/public/settingsController.js';
import {
  getAvailability,
  getAvailabilityCalendar,
  getEarliestDate,
} from '../controllers/public/availabilityController.js';
import {
  getActiveOffers,
  validateOfferCode,
  previewCartOffers,
} from '../controllers/public/offerController.js';
import { createStockAlert } from '../controllers/public/stockAlertController.js';
import { validateCart } from '../controllers/public/cartController.js';
import { createOrder, trackOrder } from '../controllers/public/orderController.js';
import { uploadPaymentScreenshot } from '../controllers/public/uploadController.js';
import { orderLimiter, stockAlertLimiter, uploadLimiter, trackLimiter } from '../middleware/rateLimit.js';
import { attachCustomerIfPresent } from '../middleware/customerAuth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/products/hot-selling', asyncHandler(getHotSelling));
router.get('/products/:slug', asyncHandler(getProductBySlug));
router.get('/products', asyncHandler(listProducts));

router.get('/categories', asyncHandler(listCategories));

router.get('/settings/public', asyncHandler(getPublicSettings));

router.get('/availability/calendar', asyncHandler(getAvailabilityCalendar));
router.get('/availability/earliest', asyncHandler(getEarliestDate));
router.get('/availability', asyncHandler(getAvailability));

router.get('/offers/active', asyncHandler(getActiveOffers));
// Optional-auth: a logged-in customer's identity sharpens first-order / per-
// customer gating, but guests can preview too.
router.post('/offers/validate', asyncHandler(attachCustomerIfPresent), asyncHandler(validateOfferCode));
router.post('/offers/preview', asyncHandler(attachCustomerIfPresent), asyncHandler(previewCartOffers));

router.post('/stock-alerts', stockAlertLimiter, asyncHandler(createStockAlert));

router.post('/cart/validate', asyncHandler(validateCart));

router.post('/orders', orderLimiter, asyncHandler(attachCustomerIfPresent), asyncHandler(createOrder));
router.get('/orders/track/:orderId', trackLimiter, asyncHandler(trackOrder));

router.post(
  '/uploads/payment-screenshot',
  uploadLimiter,
  upload.single('file'),
  asyncHandler(uploadPaymentScreenshot)
);

export default router;
