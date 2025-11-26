/**
 * Error Tracking Service
 * Integrates with Sentry for production error monitoring
 */

const Sentry = require("@sentry/electron");
const logger = require("./logger");
const config = require("../config/constants");

let initialized = false;

/**
 * Initialize error tracking
 * @param {Object} options - Configuration options
 */
const initializeErrorTracking = (options = {}) => {
  if (initialized) {
    logger.warn("Error tracking already initialized");
    return;
  }

  // Only initialize in production
  if (config.isProduction && process.env.SENTRY_DSN) {
    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: config.isProduction ? "production" : "development",
        // eslint-disable-next-line global-require
        release: require("../../../package.json").version,
        tracesSampleRate: 1.0,
        beforeSend(event) {
          // Filter out sensitive information
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }
          return event;
        },
        ...options,
      });

      initialized = true;
      logger.success("Error tracking initialized");
    } catch (error) {
      logger.error("Failed to initialize error tracking:", error);
    }
  } else {
    logger.info("Error tracking disabled in development");
  }
};

/**
 * Track an error
 * @param {Error} error - Error to track
 * @param {Object} context - Additional context
 */
const trackError = (error, context = {}) => {
  logger.error("Error tracked:", error, context);

  if (initialized) {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach((key) => {
        scope.setContext(key, context[key]);
      });
      Sentry.captureException(error);
    });
  }
};

/**
 * Track a message
 * @param {string} message - Message to track
 * @param {string} level - Severity level
 * @param {Object} context - Additional context
 */
const trackMessage = (message, level = "info", context = {}) => {
  logger.info("Message tracked:", message, level, context);

  if (initialized) {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach((key) => {
        scope.setContext(key, context[key]);
      });
      Sentry.captureMessage(message, level);
    });
  }
};

/**
 * Set user context
 * @param {Object} user - User information
 */
const setUser = (user) => {
  if (initialized) {
    Sentry.setUser(user);
  }
};

/**
 * Clear user context
 */
const clearUser = () => {
  if (initialized) {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb
 * @param {Object} breadcrumb - Breadcrumb data
 */
const addBreadcrumb = (breadcrumb) => {
  if (initialized) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

/**
 * Wrap a function with error tracking
 * @param {Function} fn - Function to wrap
 * @param {string} name - Function name for tracking
 * @returns {Function} Wrapped function
 */
const wrapFunction = (fn, name) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      trackError(error, {
        function: name,
        arguments: args,
      });
      throw error;
    }
  };
};

module.exports = {
  initializeErrorTracking,
  trackError,
  trackMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  wrapFunction,
};
