/**
 * Window Management Module - React Version
 * Handles BrowserWindow creation and configuration
 * Loads Vite dev server in development, built files in production
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/constants');
const sessionService = require('../services/session');
const updater = require('../services/updater');

let mainWindow = null;

/**
 * Get main window instance
 */
const getMainWindow = () => mainWindow;

/**
 * Setup webview configuration
 */
const setupWebviewConfig = (window) => {
  window.webContents.on('will-attach-webview', (event, webPreferences, _params) => {
    webPreferences.preload = path.join(__dirname, '..', '..', 'preload', 'stealthPreload.js');
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.webSecurity = true;
    webPreferences.sandbox = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.javascript = true;
    webPreferences.plugins = true;
    webPreferences.webviewTag = true;
    webPreferences.backgroundThrottling = false;
    webPreferences.offscreen = false;
    webPreferences.enableBlinkFeatures = 'ExecutionContext';
    webPreferences.experimentalFeatures = true;
    webPreferences.spellcheck = true;

    logger.security('Webview attached with stealth mode and default user agent');
  });
};

/**
 * Setup window event handlers
 */
const setupWindowHandlers = (window) => {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Handle load errors
  window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode !== -3) { // -3 is ERR_ABORTED, which is normal
      logger.error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    }
  });

  window.once('ready-to-show', () => {
    window.show();
    window.focus();

    // Initialize updater in production
    if (config.isProduction) {
      updater.initializeUpdater(require('electron').app);
    }
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (config.isDevelopment) {
    window.webContents.openDevTools();
  }
};

/**
 * Create main window
 */
const createWindow = () => {
  const iconPath = path.join(__dirname, '..', '..', '..', 'assets', 'icon.ico');
  
  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    minWidth: config.window.minWidth,
    minHeight: config.window.minHeight,
    webPreferences: {
      ...config.security,
      preload: path.join(__dirname, '..', '..', 'preload', 'preload.js'),
      webviewTag: true,
    },
    icon: iconPath,
    title: 'Data Extractor',
    titleBarStyle: 'default',
    show: false,
  });

  // Set app user model ID for Windows taskbar grouping
  if (process.platform === 'win32') {
    mainWindow.setAppDetails({
      appId: 'com.dataextractor.desktop',
      appIconPath: iconPath,
      appIconIndex: 0,
      relaunchCommand: process.execPath,
      relaunchDisplayName: 'Data Extractor'
    });
  }

  // Load Vite dev server in development, built files in production
  // Check if packaged (production) or not (development)
  const isPackaged = require('electron').app.isPackaged;
  
  if (!isPackaged) {
    // Development mode - load from Vite dev server
    const viteUrl = 'http://localhost:5173';
    
    logger.info(`Loading from Vite dev server: ${viteUrl}`);
    
    mainWindow.loadURL(viteUrl).catch((err) => {
      logger.error('Failed to load Vite dev server:', err);
      logger.error('Make sure Vite dev server is running on port 5173');
      logger.error('Run: pnpm --filter desktop dev');
    });
  } else {
    // Production mode - load from built files
    logger.info('Loading from built files');
    mainWindow.loadFile(path.join(__dirname, '..', '..', '..', 'dist-renderer', 'index.html'));
  }

  // Setup configurations
  sessionService.initializeSession(mainWindow);
  setupWebviewConfig(mainWindow);
  setupWindowHandlers(mainWindow);

  // Set window reference in services
  updater.setMainWindow(mainWindow);

  logger.success('Main window created successfully (React + Vite)');

  return mainWindow;
};

module.exports = {
  createWindow,
  getMainWindow,
};
