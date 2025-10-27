/**
 * Auto-Updater Service
 * Manages application updates with GitHub releases
 * Functional approach to update management
 */

// Try to load updater modules, but don't fail if they're missing
let autoUpdater = null;
let updateElectronApp = null;

try {
  autoUpdater = require('electron-updater').autoUpdater;
  updateElectronApp = require('update-electron-app').updateElectronApp;
} catch (error) {
  console.warn('Auto-updater modules not available:', error.message);
}

// eslint-disable-next-line import/no-extraneous-dependencies
const { dialog } = require('electron');
const logger = require('../utils/logger');
const config = require('../config/constants');

let updateCheckInProgress = false;
let mainWindow = null;

/**
 * Set main window reference
 */
const setMainWindow = (window) => {
  mainWindow = window;
};

/**
 * Send message to renderer
 */
const sendToRenderer = (channel, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
};

/**
 * Check for updates
 */
const checkForUpdates = () => {
  if (!autoUpdater || updateCheckInProgress) return;

  updateCheckInProgress = true;
  logger.update('Checking for updates...');

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    logger.error('Update check failed:', err);
    updateCheckInProgress = false;
  });
};

/**
 * Setup update event handlers
 */
const setupUpdateHandlers = () => {
  if (!autoUpdater) return;
  
  autoUpdater.on('checking-for-update', () => {
    logger.update('Checking for update...');
    sendToRenderer('update-log', '🔍 Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    logger.update('Update available:', info.version);
    sendToRenderer('update-log', `✅ Update available: ${info.version}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Download and Install', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update Available',
        message: `Version ${info.version} is available!`,
        detail: 'A new version is available. Download and install now?',
      });

      if (response === 0) {
        logger.update('User chose to download update');
        sendToRenderer('update-log', '📥 Starting download...');
      } else {
        logger.update('User chose to install later');
        sendToRenderer('update-log', '⏰ Update postponed');
      }

      sendToRenderer('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.update('Update not available:', info.version);
    updateCheckInProgress = false;
  });

  autoUpdater.on('error', (err) => {
    logger.error('Update error:', err);
    updateCheckInProgress = false;
    sendToRenderer('update-log', `💥 Update error: ${err.message}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (err.message.includes('ENOTFOUND') || err.message.includes('network')) {
        dialog.showMessageBoxSync(mainWindow, {
          type: 'warning',
          buttons: ['OK'],
          title: 'Update Check Failed',
          message: 'Unable to check for updates',
          detail: 'Please check your internet connection and try again later.',
        });
      }
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `📥 Download progress: ${Math.round(progressObj.percent)}%`;
    logger.update(logMessage);
    sendToRenderer('update-log', logMessage);
    sendToRenderer('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.update('Update downloaded:', info.version);
    updateCheckInProgress = false;
    sendToRenderer('update-log', `✅ Update downloaded: v${info.version}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'info',
        buttons: ['Restart and Install', 'Install Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update Ready',
        message: `Version ${info.version} is ready to install!`,
        detail: 'Restart now or install on next app start?',
      });

      if (response === 0) {
        logger.update('User chose to restart and install');
        sendToRenderer('update-log', '🔄 Restarting to install update...');
        setImmediate(() => autoUpdater.quitAndInstall());
      } else {
        logger.update('User chose to install later');
        sendToRenderer('update-log', '⏰ Update will install on next restart');
        sendToRenderer('update-ready', info);
      }
    }
  });
};

/**
 * Initialize auto-updater
 */
const initializeUpdater = (app) => {
  if (!autoUpdater || !updateElectronApp) {
    logger.warn('Auto-updater not available - skipping update checks');
    return;
  }

  if (config.isDevelopment) {
    logger.info('Skipping auto-updater in development mode');
    return;
  }

  logger.update('Auto-updater initializing...');
  logger.info('Current version:', app.getVersion());
  logger.info('Repository:', `${config.repository.owner}/${config.repository.repo}`);

  try {
    updateElectronApp({
      repo: `${config.repository.owner}/${config.repository.repo}`,
      updateInterval: config.network.updateCheckInterval,
      logger: console,
    });

    setupUpdateHandlers();

    // Check for updates after 3 seconds
    setTimeout(checkForUpdates, 3000);
  } catch (error) {
    logger.error('Failed to initialize auto-updater:', error.message);
  }
};

module.exports = {
  setMainWindow,
  initializeUpdater,
  checkForUpdates,
};
