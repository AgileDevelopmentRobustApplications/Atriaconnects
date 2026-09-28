/**
 * Simple in-memory rate limiter for client-side defense-in-depth.
 * Note: This is NOT a replacement for server-side rate limiting.
 */

export class RateLimiter {
  constructor({ maxAttempts = 5, windowMs = 60 * 1000 } = {}) {
    this.limit = maxAttempts;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  check(key) {
    const now = Date.now();
    const data = this.hits.get(key);

    if (!data) return true;

    if (now - data.startTime > this.windowMs) {
      this.hits.delete(key);
      return true;
    }

    return data.count < this.limit;
  }

  record(key) {
    const now = Date.now();
    const data = this.hits.get(key) || { startTime: now, count: 0 };

    if (now - data.startTime > this.windowMs) {
      data.startTime = now;
      data.count = 1;
    } else {
      data.count++;
    }

    this.hits.set(key, data);
  }

  remainingCooldown(key) {
    const data = this.hits.get(key);
    if (!data) return 0;
    const elapsed = Date.now() - data.startTime;
    return Math.max(0, Math.ceil((this.windowMs - elapsed) / 1000));
  }

  reset(key) {
    this.hits.delete(key);
  }
}

export function createRateLimiter(options) {
  return new RateLimiter(options);
}

export const authLimiter = new RateLimiter({ maxAttempts: 5, windowMs: 60 * 1000 });    // 5 attempts per minute
export const resetLimiter = new RateLimiter({ maxAttempts: 3, windowMs: 15 * 60 * 1000 }); // 3 resets per 15 minutes
