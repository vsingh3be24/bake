import * as authService from '../../services/customerAuthService.js';
import { signToken, COOKIE_NAMES, cookieOptions } from '../../utils/jwt.js';
import { AppError } from '../../utils/AppError.js';

function toSafeCustomer(customer) {
  return {
    id: customer._id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    tier: customer.tier,
    loyaltyPoints: customer.loyaltyPoints,
    totalOrders: customer.totalOrders,
    addresses: customer.addresses,
    favourites: customer.favourites,
  };
}

function issueSession(res, customer) {
  const token = signToken('customer', { sub: customer._id.toString() });
  res.cookie(COOKIE_NAMES.customer, token, cookieOptions());
}

export async function signup(req, res) {
  const customer = await authService.signup(req.body);
  issueSession(res, customer);
  res.status(201).json(toSafeCustomer(customer));
}

export async function login(req, res) {
  const customer = await authService.login(req.body);
  issueSession(res, customer);
  res.json(toSafeCustomer(customer));
}

export async function claimAccount(req, res) {
  const customer = await authService.claimAccount(req.body);
  issueSession(res, customer);
  res.json(toSafeCustomer(customer));
}

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAMES.customer, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
}

export async function getMe(req, res) {
  res.json(toSafeCustomer(req.customer));
}

export async function updateMe(req, res) {
  const { name, email } = req.body;
  if (name !== undefined) {
    if (!name.trim()) throw new AppError('Name cannot be empty');
    req.customer.name = name.trim();
  }
  if (email !== undefined) req.customer.email = email.trim();
  await req.customer.save();
  res.json(toSafeCustomer(req.customer));
}

export async function updatePassword(req, res) {
  await authService.changePassword(req.customer, req.body);
  res.status(204).end();
}
