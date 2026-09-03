import jwt from 'jsonwebtoken';

// Separate secrets per role (Part K checklist) — a token minted for one role
// must be structurally incapable of being replayed as the other, even if
// someone got the role claim to say otherwise.
const SECRETS = {
  customer: process.env.CUSTOMER_JWT_SECRET,
  owner: process.env.OWNER_JWT_SECRET,
};

const EXPIRY = process.env.JWT_EXPIRY || '7d';

// Pin the algorithm on both sides. Verifying without an explicit allowlist
// lets the token's own header choose how it's checked — the classic
// algorithm-confusion foothold — so the value is fixed here, not negotiated.
const ALGORITHM = 'HS256';

export function signToken(role, payload) {
  const secret = SECRETS[role];
  if (!secret) throw new Error(`No JWT secret configured for role "${role}"`);
  return jwt.sign({ ...payload, role }, secret, { expiresIn: EXPIRY, algorithm: ALGORITHM });
}

export function verifyToken(role, token) {
  const secret = SECRETS[role];
  if (!secret) throw new Error(`No JWT secret configured for role "${role}"`);
  const decoded = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
  // Belt-and-suspenders: even though the secret is role-specific, refuse a
  // token whose own claim disagrees with the role we verified it against.
  if (decoded.role !== role) throw new Error('Token role mismatch');
  return decoded;
}

export const COOKIE_NAMES = {
  customer: 'lhh_customer_token',
  owner: 'lhh_owner_token',
};

export function cookieOptions() {
  // Vercel (client) and Render (API) are different registrable domains, so
  // this is a cross-site request in production — `sameSite: 'strict'` (or
  // 'lax') would make the browser drop the cookie on every API call and
  // silently break login. Cross-site cookies require 'none', which browsers
  // only honor alongside `secure: true`. Locally client and server share
  // the same site (localhost, different port), so 'strict' still applies
  // there and stays the tighter default outside production.
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: production ? 'none' : 'strict',
    secure: production,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
