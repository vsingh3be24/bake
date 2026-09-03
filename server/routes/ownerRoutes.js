import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { loginLimiter, orderLimiter, uploadLimiter } from '../middleware/rateLimit.js';
import * as auth from '../controllers/owner/authController.js';
import * as dashboard from '../controllers/owner/dashboardController.js';
import * as orders from '../controllers/owner/orderController.js';
import * as products from '../controllers/owner/productController.js';
import * as offers from '../controllers/owner/offerController.js';
import * as queue from '../controllers/owner/queueController.js';
import * as customers from '../controllers/owner/customerController.js';
import * as settings from '../controllers/owner/settingsController.js';
import * as notifications from '../controllers/owner/notificationController.js';
import * as analytics from '../controllers/owner/analyticsController.js';

const router = Router();
const protect = asyncHandler(requireOwner);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/login', loginLimiter, asyncHandler(auth.login));
router.post('/logout', asyncHandler(auth.logout));
router.get('/me', protect, asyncHandler(auth.getMe));
router.patch('/me/password', protect, asyncHandler(auth.updatePassword));

router.get('/dashboard', protect, asyncHandler(dashboard.getDashboard));

// Settings screen (Part D.11) — 6 data tabs share one GET/PATCH; Account tab
// is the password route above, kept separate since it needs currentPassword
// verification rather than a plain field write.
router.get('/settings', protect, asyncHandler(settings.getOwnerSettings));
router.patch('/settings', protect, asyncHandler(settings.patchSettings));
router.post('/upload', protect, uploadLimiter, upload.single('file'), asyncHandler(settings.uploadImage));

router.get('/orders', protect, asyncHandler(orders.listOrders));
router.get('/orders/:id', protect, asyncHandler(orders.getOrder));
router.patch('/orders/:id/status', protect, asyncHandler(orders.updateStatus));
router.patch('/orders/:id/payment', protect, asyncHandler(orders.updatePayment));
router.patch('/orders/:id/priority', protect, asyncHandler(orders.updatePriority));
router.patch('/orders/:id/note', protect, asyncHandler(orders.updateNote));
router.post('/orders/:id/cancel', protect, asyncHandler(orders.cancelOrder));
router.post('/orders/:id/reject', protect, asyncHandler(orders.rejectOrder));
router.post('/orders/manual', protect, orderLimiter, asyncHandler(orders.manualOrder));

// Stock screen (Part D.4). Bulk route is declared before the :id routes so
// "bulk-stock" is never captured as a product id.
router.get('/products/stock', protect, asyncHandler(products.listStock));
router.patch('/products/bulk-stock', protect, asyncHandler(products.bulkStock));
router.patch('/products/:id/stock', protect, asyncHandler(products.updateStock));
router.patch('/products/:id/hot-selling', protect, asyncHandler(products.toggleHotSelling));

// Products screen — full create/edit/archive, plus its own image upload
// (separate Cloudinary folder from settings' uploadImage).
router.get('/products', protect, asyncHandler(products.listProducts));
router.post('/products', protect, asyncHandler(products.createProduct));
router.post('/products/upload-image', protect, uploadLimiter, upload.single('file'), asyncHandler(products.uploadProductImage));
router.get('/products/:id', protect, asyncHandler(products.getProduct));
router.patch('/products/:id', protect, asyncHandler(products.updateProduct));
router.patch('/products/:id/restore', protect, asyncHandler(products.restoreProduct));
router.delete('/products/:id', protect, asyncHandler(products.archiveProduct));

// Offers (Part D.7). Static/collection routes before the :id ones.
router.get('/offers', protect, asyncHandler(offers.listOffers));
router.post('/offers', protect, asyncHandler(offers.createOffer));
router.post('/offers/quick-flash', protect, asyncHandler(offers.quickFlash));
router.get('/offers/:id', protect, asyncHandler(offers.getOffer));
router.patch('/offers/:id', protect, asyncHandler(offers.updateOffer));
router.delete('/offers/:id', protect, asyncHandler(offers.deleteOffer));
router.patch('/offers/:id/toggle', protect, asyncHandler(offers.toggleOffer));
router.patch('/offers/:id/extend', protect, asyncHandler(offers.extendOffer));

// Kitchen Queue Board + Baking List (Part D.5/D.6).
router.get('/queue', protect, asyncHandler(queue.getQueue));
router.get('/baking-list', protect, asyncHandler(queue.getBaking));

// Customers screen (Part D.9).
router.get('/customers', protect, asyncHandler(customers.listCustomers));
router.get('/customers/:id', protect, asyncHandler(customers.getCustomer));
router.patch('/customers/:id/note', protect, asyncHandler(customers.updateNote));
router.patch('/customers/:id/block', protect, asyncHandler(customers.toggleBlock));

router.get('/notifications', protect, asyncHandler(notifications.listNotifications));
router.patch('/notifications/read-all', protect, asyncHandler(notifications.markAllRead));
router.patch('/notifications/:id/read', protect, asyncHandler(notifications.markRead));

// Analytics (Part D.10).
router.get('/analytics', protect, asyncHandler(analytics.getOwnerAnalytics));

export default router;
