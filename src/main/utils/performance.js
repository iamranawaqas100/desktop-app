/**
 * Performance Monitoring Utility
 * Tracks application performance metrics
 */

const logger = require("./logger");

// Performance metrics storage
const metrics = new Map();
const timers = new Map();

/**
 * Start a performance timer
 * @param {string} name - Timer name
 * @returns {string} Timer ID
 */
const startTimer = (name) => {
  const id = `${name}_${Date.now()}`;
  timers.set(id, {
    name,
    startTime: performance.now(),
    startMemory: process.memoryUsage(),
  });
  return id;
};

/**
 * End a performance timer
 * @param {string} id - Timer ID
 * @returns {Object} Performance data
 */
const endTimer = (id) => {
  const timer = timers.get(id);
  if (!timer) {
    logger.warn(`Timer ${id} not found`);
    return null;
  }

  const endTime = performance.now();
  const endMemory = process.memoryUsage();
  const duration = endTime - timer.startTime;

  const result = {
    name: timer.name,
    duration,
    memory: {
      heapUsed: endMemory.heapUsed - timer.startMemory.heapUsed,
      external: endMemory.external - timer.startMemory.external,
    },
  };

  // Store metric
  if (!metrics.has(timer.name)) {
    metrics.set(timer.name, []);
  }
  metrics.get(timer.name).push(result);

  // Clean up
  timers.delete(id);

  logger.debug(`Performance [${timer.name}]:`, `${duration.toFixed(2)}ms`);

  return result;
};

/**
 * Measure a function's performance
 * @param {string} name - Measurement name
 * @param {Function} fn - Function to measure
 * @returns {Function} Wrapped function
 */
const measure = (name, fn) => {
  return async (...args) => {
    const id = startTimer(name);
    try {
      const result = await fn(...args);
      endTimer(id);
      return result;
    } catch (error) {
      endTimer(id);
      throw error;
    }
  };
};

/**
 * Get metrics for a specific operation
 * @param {string} name - Operation name
 * @returns {Object} Metrics summary
 */
const getMetrics = (name) => {
  const data = metrics.get(name);
  if (!data || data.length === 0) {
    return null;
  }

  const durations = data.map((m) => m.duration);
  const memoryUsages = data.map((m) => m.memory.heapUsed);

  return {
    name,
    count: data.length,
    duration: {
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      total: durations.reduce((a, b) => a + b, 0),
    },
    memory: {
      min: Math.min(...memoryUsages),
      max: Math.max(...memoryUsages),
      avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
    },
  };
};

/**
 * Get all metrics
 * @returns {Object} All metrics
 */
const getAllMetrics = () => {
  const result = {};
  metrics.forEach((value, name) => {
    result[name] = getMetrics(name);
  });
  return result;
};

/**
 * Clear metrics
 * @param {string} name - Optional specific metric to clear
 */
const clearMetrics = (name) => {
  if (name) {
    metrics.delete(name);
  } else {
    metrics.clear();
  }
};

/**
 * Log performance summary
 */
const logSummary = () => {
  const allMetrics = getAllMetrics();
  logger.info("Performance Summary:");

  Object.entries(allMetrics).forEach(([name, data]) => {
    if (data) {
      logger.info(`  ${name}:`);
      logger.info(`    Count: ${data.count}`);
      const durationMsg =
        `    Duration: avg ${data.duration.avg.toFixed(2)}ms, ` +
        `min ${data.duration.min.toFixed(2)}ms, max ${data.duration.max.toFixed(2)}ms`;
      logger.info(durationMsg);
      logger.info(
        `    Memory: avg ${(data.memory.avg / 1024 / 1024).toFixed(2)}MB`
      );
    }
  });
};

/**
 * Monitor memory usage
 * @returns {Object} Memory usage
 */
const getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
  };
};

/**
 * Start periodic memory monitoring
 * @param {number} interval - Interval in milliseconds
 * @returns {Function} Stop function
 */
const startMemoryMonitoring = (interval = 60000) => {
  const intervalId = setInterval(() => {
    const usage = getMemoryUsage();
    logger.debug("Memory Usage:", usage);

    // Warn if heap usage is high
    const heapUsedMB = parseFloat(usage.heapUsed);
    if (heapUsedMB > 500) {
      logger.warn(`High memory usage: ${usage.heapUsed}`);
    }
  }, interval);

  return () => clearInterval(intervalId);
};

module.exports = {
  startTimer,
  endTimer,
  measure,
  getMetrics,
  getAllMetrics,
  clearMetrics,
  logSummary,
  getMemoryUsage,
  startMemoryMonitoring,
};
