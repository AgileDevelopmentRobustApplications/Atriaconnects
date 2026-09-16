/**
 * Client-side rate limiter for sensitive operations (login, password reset, etc.).
 *
 * This is defense-in-depth only — it prevents UI-level brute-force flooding.
 * True rate limiting is enforced server-side by Supabase Auth (GoTrue) which
 * has built-in rate limits for sign-in, sign-up, and password reset endpoints.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 60_000 })
 *
 *   if (!limiter.check('login')) {
 *     throw new Error('Too many attempts. Please wait before trying again.')
 *   }
 *   limiter.record('login')
 */

/**
 * @param {{ maxAttempts?: number, windowMs?: number, cooldownMs?: number }} opts
 */
export function createRateLimiter({
  maxAttempts = 5,
  windowMs = 60000,     // 1-minute sliding window
  cooldownMs = 30000,   // 30-second lockout once limit is hit
} = {}) {
  // key → { timestamps: number[], lockedUntil: number | null }
  const buckets = new Map()

  function getBucket(key) {
    if (!buckets.has(key)) {
      buckets.set(key, { timestamps: [], lockedUntil: null })
    }
    return buckets.get(key)
  }

  function prune(bucket) {
    const cutoff = Date.now() - windowMs
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff)
  }

  return {
    /**
     * Check whether an action is currently allowed.
     * @param {string} key — action identifier, e.g. 'login' or 'reset'
     * @returns {boolean}
     */
    check(key) {
      const bucket = getBucket(key)
      if (bucket.lockedUntil && Date.now() < bucket.lockedUntil) return false
      if (bucket.lockedUntil && Date.now() >= bucket.lockedUntil) {
        bucket.lockedUntil = null
        bucket.timestamps = []
      }
      prune(bucket)
      return bucket.timestamps.length < maxAttempts
    },

    /**
     * Record an attempt. If this tips us over the limit, engage the cooldown.
     * @param {string} key
     */
    record(key) {
      const bucket = getBucket(key)
      prune(bucket)
      bucket.timestamps.push(Date.now())
      if (bucket.timestamps.length >= maxAttempts) {
        bucket.lockedUntil = Date.now() + cooldownMs
      }
    },

    /**
     * Get remaining seconds until the cooldown expires (0 if not locked).
     * @param {string} key
     * @returns {number}
     */
    remainingCooldown(key) {
      const bucket = getBucket(key)
      if (!bucket.lockedUntil) return 0
      return Math.max(0, Math.ceil((bucket.lockedUntil - Date.now()) / 1000))
    },

    /** Reset all rate-limit state (e.g., on successful login). */
    reset(key) {
      buckets.delete(key)
    },
  }
}

/**
 * Shared singleton for auth-related rate limiting.
 * - Login: 5 attempts per 60s, 30s cooldown
 * - Password reset: 3 attempts per 120s, 60s cooldown
 */
export const authLimiter = createRateLimiter({ maxAttempts: 5, windowMs: 60000, cooldownMs: 30000 })
export const resetLimiter = createRateLimiter({ maxAttempts: 3, windowMs: 120000, cooldownMs: 60000 })
