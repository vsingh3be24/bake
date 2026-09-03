import Customer from '../models/Customer.js';
import { verifyToken, COOKIE_NAMES } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

/** Requires a logged-in customer; 401s otherwise. */
export async function requireCustomer(req, res, next) {
  const token = req.cookies?.[COOKIE_NAMES.customer];
  if (!token) throw new AppError('Please log in', 401);

  let decoded;
  try {
    decoded = verifyToken('customer', token);
  } catch {
    throw new AppError('Your session has expired — please log in again', 401);
  }

  const customer = await Customer.findById(decoded.sub);
  if (!customer) throw new AppError('Account not found — please log in again', 401);
  if (customer.isBlocked) {
    throw new AppError(customer.blockReason || 'Your account has been blocked', 403);
  }

  req.customer = customer;
  next();
}

/** Attaches req.customer if logged in, but never blocks the request. */
export async function attachCustomerIfPresent(req, res, next) {
  const token = req.cookies?.[COOKIE_NAMES.customer];
  if (!token) return next();

  try {
    const decoded = verifyToken('customer', token);
    const customer = await Customer.findById(decoded.sub);
    if (customer && !customer.isBlocked) req.customer = customer;
  } catch {
    // Invalid/expired token on an optional route — proceed as a guest.
  }
  next();
}
