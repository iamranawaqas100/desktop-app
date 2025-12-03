/**
 * Main Process Entry Point - React Version (API-Only Architecture)
 * Uses Vite dev server in development, built files in production
 *
 * NOTE: Data operations now go through Next.js API
 * No direct MongoDB access from desktop app
 */

const { app } = require("electron");
const logger = require("./main/utils/logger");
const config = require("./main/config/constants");
const windowManager = require("./main/core/window");
const menuManager = require("./main/core/menu");
const lifecycleManager = require("./main/core/lifecycle");
const ipcHandlers = require("./main/ipc/handlers");

// ⭐ IMPORTANT: Set App User Model ID early for Windows taskbar icon
// This MUST be set before app.whenReady() for the taskbar icon to work properly
if (process.platform === "win32") {
  app.setAppUserModelId("com.dataextractor.desktop");
}

// Enable live reload in development
if (config.isDevelopment) {
  try {
    require("electron-reload")(__dirname);
    logger.debug("Electron reload enabled");
  } catch (e) {
    logger.warn("Electron-reload not available (optional):", e.message);
  }
}

/**
 * Register custom protocol for deep linking
 */
const registerCustomProtocol = () => {
  // Register protocol for production (use 'dataextractor' to match web app)
  if (!app.isDefaultProtocolClient("dataextractor")) {
    app.setAsDefaultProtocolClient("dataextractor");
    logger.info("Registered dataextractor:// protocol");
  }
};

/**
 * Initialize application
 */
const initializeApp = () => {
  logger.info("Initializing Collector Desktop (API-Only Architecture)...");

  // Create main window
  const mainWindow = windowManager.createWindow();

  // Create application menu
  menuManager.createMenu(mainWindow);

  // Register IPC handlers
  ipcHandlers.registerHandlers();

  // ⭐ CRITICAL FIX: Handle protocol URL from first instance (Windows)
  // When app is launched via protocol URL (e.g., from browser), the URL is in process.argv
  const handleFirstInstanceProtocolUrl = () => {
    // Check command line args for protocol URL
    const protocolUrl = process.argv.find((arg) =>
      arg.startsWith("dataextractor://")
    );

    if (protocolUrl) {
      logger.info(
        "Protocol URL from first instance (command line):",
        protocolUrl
      );

      // Wait for window to be ready before sending protocol URL
      // Use 'ready-to-show' event or a small delay to ensure renderer is initialized
      if (mainWindow.webContents.isLoading()) {
        mainWindow.webContents.once("did-finish-load", () => {
          logger.info("Window loaded, sending protocol URL to renderer");
          mainWindow.webContents.send("protocol-url", protocolUrl);
        });
      } else {
        // Window already loaded, send immediately
        mainWindow.webContents.send("protocol-url", protocolUrl);
      }
    }
  };

  // Handle protocol URL after window is ready
  mainWindow.once("ready-to-show", () => {
    handleFirstInstanceProtocolUrl();
  });

  logger.success("Application initialized successfully");
};

/**
 * Main execution
 */
const main = () => {
  // Initialize lifecycle management
  lifecycleManager.initializeLifecycle(app, windowManager.createWindow);

  // Register custom protocol
  registerCustomProtocol();

  // Request single instance lock
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    logger.warn("Another instance is running, quitting...");
    app.quit();
    return;
  }

  // Handle second instance launch (for protocol URLs)
  app.on("second-instance", (event, commandLine) => {
    logger.info("Second instance detected, focusing main window");
    logger.debug("Command line args:", commandLine);

    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // ⭐ ENHANCED: Handle protocol URL from second instance
      // Check for direct protocol URL in args
      let url = commandLine.find((arg) => arg.startsWith("dataextractor://"));

      // On Windows, sometimes the URL comes as --url=dataextractor://...
      if (!url) {
        const urlArg = commandLine.find((arg) => arg.startsWith("--url="));
        if (urlArg) {
          url = urlArg.substring(6); // Remove '--url='
        }
      }

      if (url) {
        logger.info("Protocol URL from second instance:", url);
        mainWindow.webContents.send("protocol-url", url);
      } else {
        logger.debug("No protocol URL found in second instance command line");
      }
    }
  });

  // Handle protocol URLs on macOS
  app.on("open-url", (event, url) => {
    event.preventDefault();
    logger.info("Protocol URL received (macOS):", url);
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send("protocol-url", url);
    }
  });

  // Initialize app when ready
  app.whenReady().then(initializeApp);
};

// Run the application
main();
