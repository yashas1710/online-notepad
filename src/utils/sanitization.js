/**
 * 🛡️ Input Sanitization Utility
 * Prevents XSS (Cross-Site Scripting) attacks by removing dangerous content
 * Used before syncing user input to Firebase
 */

/**
 * Sanitize HTML/JavaScript from input string
 * Removes script tags, event handlers, dangerous attributes
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized text
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  // Remove script tags and their content
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove iframe tags
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<(object|embed)[^>]*>/gi, '');

  return sanitized;
}

/**
 * Validate text length (prevent database quota abuse)
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum allowed length (default: 100KB)
 * @returns {boolean} - True if valid
 */
export function validateTextLength(text, maxLength = 100 * 1024) {
  if (typeof text !== 'string') return false;
  return text.length <= maxLength;
}
