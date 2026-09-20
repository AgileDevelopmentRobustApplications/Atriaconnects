/**
 * Input sanitization utilities for AdraConnects.
 *
 * React already escapes JSX text content (no `dangerouslySetInnerHTML` is used
 * in this codebase), but these helpers add defense-in-depth for data sent to
 * Supabase or rendered in non-JSX contexts (e.g., `title` attributes, link
 * targets, etc.).
 */

/**
 * Strip HTML tags and collapse whitespace.
 * Use on user-supplied text before inserting into the database.
 * @param {string} raw
 * @param {number} [maxLength=5000] — hard cap on character count
 * @returns {string}
 */
export function sanitizeText(raw, maxLength = 5000) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars (keep \n \r \t)
    .trim()
    .slice(0, maxLength)
}

/**
 * Sanitize a display name — alphanumeric, spaces, common punctuation only.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeName(raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s'._(),/&-]/gu, '') // keep letters, digits, spaces, apostrophes, dots, underscores, parens, commas, slashes, ampersands, hyphens
    .trim()
    .slice(0, 100)
}

/**
 * Sanitize an email address — basic format enforcement.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeEmail(raw) {
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim().toLowerCase()
  // RFC-5322 basic check — not exhaustive but catches injection attempts
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return ''
  return trimmed.slice(0, 254) // RFC max email length
}

/**
 * Sanitize a file name for storage paths — prevent directory traversal.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeFileName(raw) {
  if (typeof raw !== 'string') return 'file'
  return raw
    .replace(/\.\./g, '')     // prevent directory traversal
    .replace(/[/\\]/g, '_')   // flatten path separators
    .replace(/[^\w.-]/g, '_') // only safe chars
    .slice(0, 255)
    || 'file'
}
