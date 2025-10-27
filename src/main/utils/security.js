/**
 * Security Utilities
 * Input sanitization and validation
 */

const logger = require('./logger');

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
const sanitizeHtml = (html) => {
  if (!html) return '';

  // Basic HTML entity encoding
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return String(html).replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Sanitize URL to prevent injection
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
const sanitizeUrl = (url) => {
  if (!url) return '';

  // Remove javascript: and data: protocols
  // eslint-disable-next-line no-script-url
  const dangerous = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lower = url.toLowerCase().trim();

  const isDangerous = dangerous.some((protocol) => lower.startsWith(protocol));
  if (isDangerous) {
    logger.warn('Dangerous URL protocol detected:', url);
    return '';
  }

  return url;
};

/**
 * Validate and sanitize file path
 * @param {string} filePath - File path to validate
 * @returns {string} Sanitized path
 */
const sanitizeFilePath = (filePath) => {
  if (!filePath) return '';

  // Remove path traversal attempts and dangerous characters
  const sanitized = filePath
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/^[/\\]+/, ''); // Remove leading slashes

  if (sanitized !== filePath) {
    logger.warn('Path traversal attempt detected:', filePath);
  }

  return sanitized;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
const isValidEmail = (email) => {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid
 */
const isValidUrl = (url) => {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Rate limiter for preventing abuse
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Rate limit checker
 */
const createRateLimiter = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();

  return (identifier) => {
    const now = Date.now();
    const userRequests = requests.get(identifier) || [];

    // Remove old requests outside the window
    const recentRequests = userRequests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for: ${identifier}`);
      return false;
    }

    recentRequests.push(now);
    requests.set(identifier, recentRequests);
    return true;
  };
};

/**
 * Generate secure random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
const generateToken = (length = 32) => {
  // eslint-disable-next-line global-require
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
const hashData = (data) => {
  // eslint-disable-next-line global-require
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePasswordStrength = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain number' };
  }

  return { valid: true, message: 'Password is strong' };
};

/**
 * Sanitize object for logging (remove sensitive data)
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeForLogging = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitive = ['password', 'token', 'secret', 'apiKey', 'api_key', 'accessToken'];
  const sanitized = { ...obj };

  Object.keys(sanitized).forEach((key) => {
    if (sensitive.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  });

  return sanitized;
};

module.exports = {
  sanitizeHtml,
  sanitizeUrl,
  sanitizeFilePath,
  isValidEmail,
  isValidUrl,
  createRateLimiter,
  generateToken,
  hashData,
  validatePasswordStrength,
  sanitizeForLogging,
};
