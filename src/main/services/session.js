/**
 * Session Management Service
 * Handles browser session configuration for stealth mode
 * Pure functions for session setup
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { session } = require('electron');
const logger = require('../utils/logger');
const config = require('../config/constants');

/**
 * Setup request header modifications
 */
const setupRequestHeaders = () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders;

    // Remove automation detection headers
    delete headers['X-Requested-With'];
    delete headers['X-DevTools-Emulate-Network-Conditions-Client-Id'];

    // Add realistic headers
    Object.entries(config.stealthHeaders).forEach(([key, value]) => {
      if (!headers[key]) {
        headers[key] = value;
      }
    });

    callback({ requestHeaders: headers });
  });

  logger.security('Request headers configured for stealth mode');
};

/**
 * Setup response header modifications
 */
const setupResponseHeaders = () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    // Keep CSP but ensure it doesn't block rendering
    callback({ responseHeaders: headers });
  });

  logger.security('Response headers configured');
};

/**
 * Setup permission handler
 */
const setupPermissionHandler = (webContents) => {
  webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    callback(true);
  });

  logger.security('Permission handler configured');
};

/**
 * Initialize session configuration
 */
const initializeSession = (mainWindow) => {
  setupRequestHeaders();
  setupResponseHeaders();
  setupPermissionHandler(mainWindow.webContents);

  logger.success('Session configuration complete');
};

module.exports = {
  initializeSession,
  setupPermissionHandler,
};
