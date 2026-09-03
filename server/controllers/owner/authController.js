import * as ownerAuthService from '../../services/ownerAuthService.js';
import { signToken, COOKIE_NAMES, cookieOptions } from '../../utils/jwt.js';

function toSafeAdmin(admin) {
  return { id: admin._id, name: admin.name, phone: admin.phone };
}

export async function login(req, res) {
  const admin = await ownerAuthService.login(req.body);
  const token = signToken('owner', { sub: admin._id.toString() });
  res.cookie(COOKIE_NAMES.owner, token, cookieOptions());
  res.json(toSafeAdmin(admin));
}

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAMES.owner, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
}

export async function getMe(req, res) {
  res.json(toSafeAdmin(req.owner));
}

export async function updatePassword(req, res) {
  await ownerAuthService.changePassword(req.owner, req.body);
  res.status(204).end();
}
