import { describe, it, expect } from 'vitest'
import { sanitizeName, sanitizeEmail, sanitizeText, sanitizeFileName } from '../lib/sanitize.js'
import { createRateLimiter } from '../lib/rate-limit.js'

describe('Input Sanitization', () => {
  describe('sanitizeName', () => {
    it('allows legitimate academic and compound names', () => {
      const validNames = [
        'John Doe',
        "O'Connor",
        'Jean-Luc Picard',
        'St. John',
        'Department of CSE/IT',
        'R&D Division',
        'User (Admin)',
        'Name_With_Underscore',
        'Smith, Jane',
      ]
      validNames.forEach(name => {
        expect(sanitizeName(name)).toBe(name)
      })
    })

    it('strips HTML tags', () => {
      expect(sanitizeName('<script>alert(1)</script>John')).toBe('alert(1)John')
      expect(sanitizeName('<b>John</b>')).toBe('John')
    })

    it('strips forbidden special characters', () => {
      expect(sanitizeName('John @ Doe')).toBe('John  Doe')
      expect(sanitizeName('John # Doe')).toBe('John  Doe')
      expect(sanitizeName('John $ Doe')).toBe('John  Doe')
    })

    it('handles non-string input', () => {
      expect(sanitizeName(null)).toBe('')
      expect(sanitizeName(undefined)).toBe('')
      expect(sanitizeName(123)).toBe('')
    })
  })

  describe('sanitizeEmail', () => {
    it('allows valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com')
      expect(sanitizeEmail(' USER@Example.Com ')).toBe('user@example.com')
    })

    it('rejects invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBe('')
      expect(sanitizeEmail('test@example')).toBe('')
      expect(sanitizeEmail('test@.com')).toBe('')
    })
  })

  describe('sanitizeText', () => {
    it('strips HTML tags', () => {
      expect(sanitizeText('<p>Hello</p>')).toBe('Hello')
    })

    it('strips control characters', () => {
      const input = 'Hello\x00World'
      expect(sanitizeText(input)).not.toContain('\x00')
    })
  })

  describe('sanitizeFileName', () => {
    it('prevents directory traversal', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('__etc_passwd')
    })

    it('replaces slashes with underscores', () => {
      expect(sanitizeFileName('my/file.txt')).toBe('my_file.txt')
    })
  })
})

describe('Rate Limiter', () => {
  it('tracks attempts and engages cooldown', () => {
    const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 1000, cooldownMs: 1000 })

    // First 3 attempts allowed
    expect(limiter.check('test')).toBe(true)
    limiter.record('test')
    expect(limiter.check('test')).toBe(true)
    limiter.record('test')
    expect(limiter.check('test')).toBe(true)
    limiter.record('test')

    // 4th attempt should be blocked
    expect(limiter.check('test')).toBe(false)

    // Should report cooldown
    expect(limiter.remainingCooldown('test')).toBeGreaterThan(0)
  })

  it('resets state on reset()', () => {
    const limiter = createRateLimiter({ maxAttempts: 3 })
    limiter.record('test')
    limiter.record('test')
    limiter.record('test')
    expect(limiter.check('test')).toBe(false)

    limiter.reset('test')
    expect(limiter.check('test')).toBe(true)
  })

  it('allows different keys to have independent limits', () => {
    const limiter = createRateLimiter({ maxAttempts: 1 })

    limiter.record('user1')
    expect(limiter.check('user1')).toBe(false)
    expect(limiter.check('user2')).toBe(true)
  })
})