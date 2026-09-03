const REQUIRED = ['MONGO_URI', 'CUSTOMER_JWT_SECRET', 'OWNER_JWT_SECRET'];
const MIN_SECRET_LENGTH = 32; // Part K: "32+ random"

/**
 * Fail fast at boot instead of at the first request. A missing secret would
 * otherwise surface as a 500 on someone's login attempt, and — worse — a
 * config where both roles share one secret would boot happily while quietly
 * undoing the customer/owner token separation the whole auth design rests on.
 */
export function validateEnv({ production = process.env.NODE_ENV === 'production' } = {}) {
  const problems = [];

  for (const key of REQUIRED) {
    if (!process.env[key]?.trim()) problems.push(`${key} is not set`);
  }

  const customer = process.env.CUSTOMER_JWT_SECRET;
  const owner = process.env.OWNER_JWT_SECRET;

  // Enforced in every environment: identical secrets mean a customer token
  // verifies as an owner token, leaving only the role claim between a
  // customer and the whole admin surface.
  if (customer && owner && customer === owner) {
    problems.push('CUSTOMER_JWT_SECRET and OWNER_JWT_SECRET must be different values');
  }

  if (production) {
    for (const key of ['CUSTOMER_JWT_SECRET', 'OWNER_JWT_SECRET']) {
      const value = process.env[key];
      if (value && value.length < MIN_SECRET_LENGTH) {
        problems.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters in production`);
      }
    }
    if (!process.env.CLIENT_URL?.trim()) {
      problems.push('CLIENT_URL is not set — CORS would fall back to blocking the site');
    }
  }

  if (problems.length > 0) {
    throw new Error(`Refusing to start — environment problems:\n  - ${problems.join('\n  - ')}`);
  }
}
