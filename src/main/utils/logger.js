/**
 * Logger utility for consistent logging across the app
 * Provides structured logging with emojis for better readability
 */

const logLevels = {
  INFO: "📘",
  SUCCESS: "✅",
  WARNING: "⚠️",
  ERROR: "❌",
  DEBUG: "🔍",
  NETWORK: "🌐",
  UPDATE: "🔄",
  SECURITY: "🔒",
};

const log = (level, ...args) => {
  const emoji = logLevels[level] || "📝";
  console.log(emoji, ...args);
};

const logger = {
  info: (...args) => log("INFO", ...args),
  success: (...args) => log("SUCCESS", ...args),
  warn: (...args) => log("WARNING", ...args),
  error: (...args) => log("ERROR", ...args),
  debug: (...args) => log("DEBUG", ...args),
  network: (...args) => log("NETWORK", ...args),
  update: (...args) => log("UPDATE", ...args),
  security: (...args) => log("SECURITY", ...args),
};

module.exports = logger;
