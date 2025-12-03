/**
 * Window Management Module - React Version (API-Only Architecture)
 * Handles BrowserWindow creation and configuration
 * Loads Vite dev server in development, built files in production
 */

const { BrowserWindow } = require("electron");
const path = require("path");
const logger = require("../utils/logger");
const config = require("../config/constants");

let mainWindow = null;

/**
 * Get main window instance
 */
const getMainWindow = () => mainWindow;

/**
 * Setup webview configuration
 */
const setupWebviewConfig = (window) => {
  window.webContents.on("will-attach-webview", (event, webPreferences) => {
    webPreferences.preload = path.join(
      __dirname,
      "..",
      "..",
      "preload",
      "stealthPreload.js"
    );
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
    webPreferences.enableBlinkFeatures = "ExecutionContext";
    webPreferences.experimentalFeatures = true;
    webPreferences.spellcheck = true;

    logger.security(
      "Webview attached with stealth mode and default user agent"
    );
  });
};

/**
 * Setup window event handlers
 */
const setupWindowHandlers = (window) => {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Handle load errors
  window.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      if (errorCode !== -3) {
        // -3 is ERR_ABORTED, which is normal
        logger.error(
          `Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`
        );
      }
    }
  );

  window.once("ready-to-show", () => {
    window.show();
    window.focus();

    // Check for updates in production
    if (config.isProduction) {
      try {
        const { autoUpdater } = require("electron-updater");
        autoUpdater.checkForUpdatesAndNotify();
        logger.info("Checking for updates...");
      } catch (error) {
        logger.warn("Auto-updater not available:", error.message);
      }
    }
  });

  window.on("closed", () => {
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
  const { app, nativeImage } = require("electron");
  const fs = require("fs");

  // Get icon path - works in both dev and production
  let iconPath;
  if (app.isPackaged) {
    // Production: icon is in resources/assets
    iconPath = path.join(process.resourcesPath, "assets", "icon.ico");
  } else {
    // Development: icon is in project root assets
    iconPath = path.join(__dirname, "..", "..", "..", "assets", "icon.ico");
  }

  // Verify icon exists
  if (!fs.existsSync(iconPath)) {
    logger.warn(`Icon not found at: ${iconPath}, trying fallback...`);
    // Try logo.png as fallback
    const logoPngPath = app.isPackaged
      ? path.join(process.resourcesPath, "assets", "logo.png")
      : path.join(__dirname, "..", "..", "..", "assets", "logo.png");
    if (fs.existsSync(logoPngPath)) {
      iconPath = logoPngPath;
    }
  }

  logger.info(`Using icon path: ${iconPath}`);

  // Create native image for better Windows support
  let appIcon = null;
  try {
    appIcon = nativeImage.createFromPath(iconPath);
    if (appIcon.isEmpty()) {
      logger.warn("Icon image is empty, Windows may show default icon");
    } else {
      logger.info(`Icon loaded successfully: ${appIcon.getSize().width}x${appIcon.getSize().height}`);
    }
  } catch (err) {
    logger.error("Failed to load icon:", err.message);
  }

  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    minWidth: config.window.minWidth,
    minHeight: config.window.minHeight,
    webPreferences: {
      ...config.security,
      preload: path.join(__dirname, "..", "..", "preload", "preload.js"),
      webviewTag: true,
    },
    icon: appIcon || iconPath,
    title: "Data Extractor",
    titleBarStyle: "default",
    show: false,
  });

  // Set the window icon explicitly (helps on some Windows versions)
  if (appIcon && !appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
  }

  // Set app user model ID for Windows taskbar grouping
  if (process.platform === "win32") {
    // Set the app user model ID BEFORE setting app details
    app.setAppUserModelId("com.dataextractor.desktop");
    
    mainWindow.setAppDetails({
      appId: "com.dataextractor.desktop",
      appIconPath: iconPath,
      appIconIndex: 0,
      relaunchCommand: process.execPath,
      relaunchDisplayName: "Data Extractor",
    });
  }

  // Load Vite dev server in development, built files in production
  // Check if packaged (production) or not (development)
  const isPackaged = require("electron").app.isPackaged;

  if (!isPackaged) {
    // Development mode - load from Vite dev server
    const viteUrl = "http://localhost:5173";

    logger.info(`Loading from Vite dev server: ${viteUrl}`);

    mainWindow.loadURL(viteUrl).catch((err) => {
      logger.error("Failed to load Vite dev server:", err);
      logger.error("Make sure Vite dev server is running on port 5173");
      logger.error("Run: pnpm --filter desktop dev");
    });
  } else {
    // Production mode - load from built files
    logger.info("Loading from built files");
    mainWindow.loadFile(
      path.join(__dirname, "..", "..", "..", "dist-renderer", "index.html")
    );
  }

  // Setup configurations
  setupWebviewConfig(mainWindow);
  setupWindowHandlers(mainWindow);

  // Initialize session with security settings
  const ses = mainWindow.webContents.session;
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ["notifications"];
    callback(allowedPermissions.includes(permission));
  });

  logger.success("Main window created successfully (React + Vite + API-Only)");

  return mainWindow;
};

module.exports = {
  createWindow,
  getMainWindow,
};
