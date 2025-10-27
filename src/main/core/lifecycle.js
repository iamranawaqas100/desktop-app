/**
 * Application Lifecycle Module
 * Manages app initialization and cleanup
 * Functional approach to lifecycle management
 */

const logger = require('../utils/logger');
const dataService = require('../services/data');
const config = require('../config/constants');

/**
 * Setup command line switches for stealth mode
 */
const setupCommandLineSwitches = (app) => {
  config.commandLineSwitches.forEach(({ key, value }) => {
    if (value) {
      app.commandLine.appendSwitch(key, value);
    } else {
      app.commandLine.appendSwitch(key);
    }
  });

  // Enable CDP debugging in development
  if (config.isDevelopment || process.env.ENABLE_CDP === 'true') {
    app.commandLine.appendSwitch('remote-debugging-port', config.network.debugPort);
    app.commandLine.appendSwitch('remote-allow-origins', '*');
    logger.debug(`CDP debugging enabled on port ${config.network.debugPort}`);
  }

  logger.success('Command line switches configured');
};

/**
 * Setup before quit handler
 */
const setupBeforeQuit = (app) => {
  app.on('before-quit', () => {
    dataService.clearAllData();
    logger.info('Application cleanup complete');
  });
};

/**
 * Setup window all closed handler
 */
const setupWindowAllClosed = (app) => {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      dataService.clearAllData();
      app.quit();
    }
  });
};

/**
 * Setup activate handler (macOS)
 */
const setupActivate = (app, createWindow) => {
  app.on('activate', () => {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    const { BrowserWindow } = require('electron');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
};

/**
 * Initialize application lifecycle
 */
const initializeLifecycle = (app, createWindow) => {
  setupCommandLineSwitches(app);
  setupBeforeQuit(app);
  setupWindowAllClosed(app);
  setupActivate(app, createWindow);

  logger.success('Application lifecycle configured');
};

module.exports = {
  initializeLifecycle,
};
