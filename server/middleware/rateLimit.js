import rateLimit from 'express-rate-limit';

// Part K: /api/orders capped at 5/min/IP.
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests — please try again in a minute' },
});

export const stockAlertLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests — please try again in a minute' },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads — please try again in a minute' },
});

// Part K: login capped 5/15min — the password-guessing surface, kept tight.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts — please try again in 15 minutes' },
});

/**
 * Order IDs run in a readable sequence (LHH-DDMM-0001), and tracking is
 * public by design so a guest can check an order without an account. That
 * combination is enumerable, so the lookup is capped: a real customer
 * refreshing their order never notices, bulk scraping of other people's
 * names and baskets does.
 */
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many lookups — please try again in a minute' },
});

// Signup/claim aren't a password-guessing surface the same way login is — a
// real user fixing typos (weak password, wrong phone format) shouldn't get
// locked out of creating an account. Looser, but still bounded against
// account-creation spam.
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts — please try again in 15 minutes' },
});
