import { sanitize } from './sanitize'

/**
 * Validation and sanitization utilities for user input.
 */
export const validation = {
  trim: (str) => (typeof str === 'string' ? str.trim() : str),

  sanitizeString: (str) => {
    if (typeof str !== 'string') return str;
    return sanitize(str);
  },

  validateRequired: (val, fieldName) => {
    if (!val || (typeof val === 'string' && val.trim().length === 0)) {
      throw new Error(`${fieldName} is required`);
    }
    return true;
  },
}
