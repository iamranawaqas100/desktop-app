/**
 * IPC Handlers Module
 * Centralized IPC communication handlers
 *
 * NOTE: Data operations (CRUD) now go through the Next.js API.
 * This file only handles utility functions and system-level operations.
 */

const { ipcMain, shell } = require("electron");
const logger = require("../utils/logger");
const config = require("../config/constants");

/**
 * Get app version handler
 */
const handleGetAppVersion = async () => {
  // eslint-disable-next-line global-require
  const { version } = require("../../../package.json");
  logger.debug("App version requested:", version);
  return version;
};

/**
 * Get API URL handler
 */
const handleGetApiUrl = async () => {
  const apiUrl = config.api.baseUrl;
  logger.debug("API URL requested:", apiUrl);
  return apiUrl;
};

/**
 * Check if app is running in dev mode
 */
const handleIsDevMode = async () => {
  const { app } = require("electron");
  const isDevMode = !app.isPackaged;
  logger.debug("Dev mode check:", isDevMode);
  return isDevMode;
};

/**
 * Check for updates handler
 */
const handleCheckForUpdates = async () => {
  try {
    // eslint-disable-next-line global-require
    const { autoUpdater } = require("electron-updater");
    autoUpdater.checkForUpdatesAndNotify();
    return { success: true };
  } catch (error) {
    logger.error("Update check error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Install update handler
 */
const handleInstallUpdate = async () => {
  try {
    // eslint-disable-next-line global-require
    const { autoUpdater } = require("electron-updater");
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    logger.error("Install update error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Open external URL handler
 */
const handleOpenExternal = async (event, url) => {
  try {
    await shell.openExternal(url);
    logger.info("Opened external URL:", url);
    return { success: true };
  } catch (error) {
    logger.error("Error opening external URL:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get asset path - returns correct path for both dev and production
 */
const handleGetAssetPath = async (event, assetName) => {
  const path = require("path");
  const { app } = require("electron");

  let assetPath;

  if (app.isPackaged) {
    // Production: assets are in resources/assets
    assetPath = path.join(process.resourcesPath, "assets", assetName);
  } else {
    // Development: assets are in project root assets
    assetPath = path.join(__dirname, "..", "..", "..", "assets", assetName);
  }

  logger.debug(`Asset path for "${assetName}": ${assetPath}`);
  return assetPath;
};

/**
 * Register all IPC handlers
 */
const registerHandlers = () => {
  // App info handlers
  ipcMain.handle("get-app-version", handleGetAppVersion);
  ipcMain.handle("get-api-url", handleGetApiUrl);
  ipcMain.handle("is-dev-mode", handleIsDevMode);

  // Update handlers
  ipcMain.handle("check-for-updates", handleCheckForUpdates);
  ipcMain.handle("install-update", handleInstallUpdate);

  // External URL handler
  ipcMain.handle("open-external", handleOpenExternal);

  // Asset path handler
  ipcMain.handle("get-asset-path", handleGetAssetPath);

  logger.success("IPC handlers registered (API-only architecture)");
};

module.exports = {
  registerHandlers,
};
