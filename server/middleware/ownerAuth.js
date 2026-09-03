import Admin from '../models/Admin.js';
import { verifyToken, COOKIE_NAMES } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

/** Requires a logged-in owner; 401s otherwise. Every /api/owner/* route sits behind this. */
export async function requireOwner(req, res, next) {
  const token = req.cookies?.[COOKIE_NAMES.owner];
  if (!token) throw new AppError('Please log in', 401);

  let decoded;
  try {
    decoded = verifyToken('owner', token);
  } catch {
    throw new AppError('Your session has expired — please log in again', 401);
  }

  const admin = await Admin.findById(decoded.sub);
  if (!admin) throw new AppError('Account not found — please log in again', 401);

  req.owner = admin;
  next();
}
