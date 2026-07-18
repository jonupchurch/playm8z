/**
 * Rate-limit policy for the auth entry points (ADR 0020). Keyed by client
 * IP, not account: an IP limit throttles a brute-forcing or enumerating
 * source without letting an attacker lock a victim out by hammering their
 * email address (which per-account keying would allow). Windows are generous
 * enough not to bite a real person retyping a password, tight enough to stop
 * scripted abuse.
 */
export const RATE_LIMITS = {
  login: { limit: 20, windowMs: 15 * 60 * 1000 }, // 20 / 15 min per IP
  register: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 / hour per IP
  passwordReset: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 / hour per IP
} as const;
