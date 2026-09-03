import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireCustomer } from '../middleware/customerAuth.js';
import { loginLimiter, signupLimiter } from '../middleware/rateLimit.js';
import * as auth from '../controllers/customer/authController.js';
import * as orders from '../controllers/customer/orderController.js';
import * as favourites from '../controllers/customer/favouriteController.js';
import * as addresses from '../controllers/customer/addressController.js';
import * as rewards from '../controllers/customer/rewardsController.js';
import * as notifications from '../controllers/customer/notificationController.js';

const router = Router();
const protect = asyncHandler(requireCustomer);

router.post('/signup', signupLimiter, asyncHandler(auth.signup));
router.post('/login', loginLimiter, asyncHandler(auth.login));
router.post('/claim', signupLimiter, asyncHandler(auth.claimAccount));
router.post('/logout', asyncHandler(auth.logout));

router.get('/me', protect, asyncHandler(auth.getMe));
router.patch('/me', protect, asyncHandler(auth.updateMe));
router.patch('/me/password', protect, asyncHandler(auth.updatePassword));

router.get('/orders', protect, asyncHandler(orders.listOrders));
router.get('/orders/:id', protect, asyncHandler(orders.getOrder));
router.post('/orders/:id/reorder', protect, asyncHandler(orders.reorder));
router.post('/orders/:id/review', protect, asyncHandler(orders.addReview));

router.get('/favourites', protect, asyncHandler(favourites.listFavourites));
router.post('/favourites/:productId', protect, asyncHandler(favourites.addFavourite));
router.delete('/favourites/:productId', protect, asyncHandler(favourites.removeFavourite));

router.get('/addresses', protect, asyncHandler(addresses.listAddresses));
router.post('/addresses', protect, asyncHandler(addresses.addAddress));
router.patch('/addresses/:addressId', protect, asyncHandler(addresses.updateAddress));
router.delete('/addresses/:addressId', protect, asyncHandler(addresses.deleteAddress));

router.get('/rewards', protect, asyncHandler(rewards.getRewards));

router.get('/notifications', protect, asyncHandler(notifications.listNotifications));
router.patch('/notifications/read-all', protect, asyncHandler(notifications.markAllRead));
router.patch('/notifications/:id/read', protect, asyncHandler(notifications.markRead));

export default router;
