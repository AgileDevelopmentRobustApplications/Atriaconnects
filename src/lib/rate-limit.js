/**
 * A simple client-side rate limiter to prevent rapid-fire requests.
 * Note: This is a frontend guard; real rate limiting must be implemented
 * on the server (e.g., via Supabase/PostgREST or Edge Functions).
 */
export function createRateLimiter({ maxAttempts = 5, windowMs = 60000, cooldownMs = 60000 } = {}) {
  const attempts = new Map(); // key -> { count, firstAttemptAt, cooldownUntil }

  return {
    check: (key) => {
      const state = attempts.get(key);
      if (!state) return true;

      const now = Date.now();

      // Check if currently in cooldown
      if (state.cooldownUntil && now < state.cooldownUntil) {
        return false;
      }

      // Check if window has expired
      if (now - state.firstAttemptAt > windowMs) {
        attempts.delete(key);
        return true;
      }

      return state.count < maxAttempts;
    },

    record: (key) => {
      const now = Date.now();
      let state = attempts.get(key);

      if (!state || (now - state.firstAttemptAt > windowMs)) {
        state = { count: 0, firstAttemptAt: now, cooldownUntil: null };
      }

      state.count++;

      if (state.count >= maxAttempts) {
        state.cooldownUntil = now + cooldownMs;
      }

      attempts.set(key, state);
    },

    remainingCooldown: (key) => {
      const state = attempts.get(key);
      if (!state || !state.cooldownUntil) return 0;
      return Math.max(0, state.cooldownUntil - Date.now());
    },

    reset: (key) => {
      attempts.delete(key);
    }
  };
}
