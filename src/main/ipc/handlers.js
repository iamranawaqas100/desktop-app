/**
 * IPC Handlers Module
 * Centralized IPC communication handlers
 * Pure functions for handling renderer requests
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcMain, dialog, shell } = require('electron');
const dataService = require('../services/data');
const exportService = require('../services/export');
const updater = require('../services/updater');
const logger = require('../utils/logger');
const config = require('../config/constants');

/**
 * Get app version handler
 */
const handleGetAppVersion = async () => {
  // eslint-disable-next-line global-require
  const { version } = require('../../../package.json');
  logger.debug('App version requested:', version);
  return version;
};

/**
 * Get API URL handler
 */
const handleGetApiUrl = async () => {
  const apiUrl = config.api.baseUrl;
  logger.debug('API URL requested:', apiUrl);
  return apiUrl;
};

/**
 * Get extracted data handler
 */
const handleGetExtractedData = async () => {
  const data = dataService.getAllData();
  logger.debug(`Retrieved ${data.length} items`);
  return data;
};

/**
 * Save extracted data handler
 */
const handleSaveExtractedData = async (event, data) => {
  try {
    const savedItem = dataService.saveData(data);
    logger.success(`Saved item with ID: ${savedItem.id}`);
    return savedItem;
  } catch (error) {
    logger.error('Error saving data:', error);
    throw error;
  }
};

/**
 * Update extracted data handler
 */
const handleUpdateExtractedData = async (event, id, data) => {
  try {
    const updatedItem = dataService.updateData(id, data);
    logger.success(`Updated item with ID: ${id}`);
    return updatedItem;
  } catch (error) {
    logger.error('Error updating data:', error);
    throw error;
  }
};

/**
 * Delete extracted data handler
 */
const handleDeleteExtractedData = async (event, id) => {
  try {
    const result = dataService.deleteData(id);
    logger.success(`Deleted item with ID: ${id}`);
    return result;
  } catch (error) {
    logger.error('Error deleting data:', error);
    throw error;
  }
};

/**
 * Export data handler
 */
const handleExportData = async (event, mainWindow, format = 'json') => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Extracted Data',
    defaultPath: `extracted-data-${new Date().toISOString().slice(0, 10)}.${format}`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'CSV Files', extensions: ['csv'] },
    ],
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const data = dataService.getAllData();
    const exportResult = exportService.exportData(data, result.filePath, format);

    return { ...exportResult, count: data.length };
  } catch (error) {
    logger.error('Export error:', error);
    throw error;
  }
};

/**
 * Check for updates handler
 */
const handleCheckForUpdates = async () => {
  try {
    updater.checkForUpdates();
    return { success: true };
  } catch (error) {
    logger.error('Update check error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Install update handler
 */
const handleInstallUpdate = async () => {
  try {
    // eslint-disable-next-line global-require
    const { autoUpdater } = require('electron-updater');
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    logger.error('Install update error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Open external URL handler
 */
const handleOpenExternal = async (event, url) => {
  try {
    await shell.openExternal(url);
    logger.info('Opened external URL:', url);
    return { success: true };
  } catch (error) {
    logger.error('Error opening external URL:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save manual menu items to API
 */
const handleSaveManualMenuItems = async (event, data) => {
  try {
    const { items, authToken, apiUrl } = data;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('No items to save');
    }

    if (!authToken) {
      throw new Error('No authentication token provided');
    }

    const baseUrl = apiUrl || 'http://localhost:3000';
    const endpoint = `${baseUrl}/api/menu-items/manual`;

    logger.info(`Saving ${items.length} manual menu items to API...`);

    // Make API call to save items
    const fetch = require('node-fetch');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API returned status: ${response.status}`);
    }

    const result = await response.json();
    logger.success(`Saved ${result.count} manual menu items successfully`);
    
    return {
      success: true,
      count: result.count,
      results: result.results,
      errors: result.errors,
    };
  } catch (error) {
    logger.error('Error saving manual menu items:', error);
    throw error;
  }
};

/**
 * Fetch collection context (restaurant, collection, quarter info)
 */
const handleGetCollectionContext = async (event, data) => {
  try {
    const { restaurantId, authToken, apiUrl } = data;
    
    if (!restaurantId || !authToken) {
      throw new Error('Missing required parameters');
    }

    const baseUrl = apiUrl || 'http://localhost:3000';
    const endpoint = `${baseUrl}/api/collection-restaurants?restaurantId=${restaurantId}`;

    logger.info(`Fetching collection context for restaurant: ${restaurantId}`);

    const fetch = require('node-fetch');
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API returned status: ${response.status}`);
    }

    const result = await response.json();
    logger.success('Collection context fetched successfully');
    
    return {
      success: true,
      context: result,
    };
  } catch (error) {
    logger.error('Error fetching collection context:', error);
    throw error;
  }
};

/**
 * Register all IPC handlers
 */
const registerHandlers = (mainWindow) => {
  // App info handlers
  ipcMain.handle('get-app-version', handleGetAppVersion);
  ipcMain.handle('get-api-url', handleGetApiUrl);

  // Data handlers
  ipcMain.handle('get-extracted-data', handleGetExtractedData);
  ipcMain.handle('save-extracted-data', handleSaveExtractedData);
  ipcMain.handle('update-extracted-data', handleUpdateExtractedData);
  ipcMain.handle('delete-extracted-data', handleDeleteExtractedData);

  // Export handler (needs mainWindow reference)
  ipcMain.handle('export-data', (event, format) => handleExportData(event, mainWindow, format));

  // Update handlers
  ipcMain.handle('check-for-updates', handleCheckForUpdates);
  ipcMain.handle('install-update', handleInstallUpdate);

  // External URL handler
  ipcMain.handle('open-external', handleOpenExternal);

  // Manual collection handlers
  ipcMain.handle('save-manual-menu-items', handleSaveManualMenuItems);
  ipcMain.handle('get-collection-context', handleGetCollectionContext);

  logger.success('IPC handlers registered');
};

module.exports = {
  registerHandlers,
};
