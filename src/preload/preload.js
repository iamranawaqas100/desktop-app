const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Data operations
  getExtractedData: () => ipcRenderer.invoke('get-extracted-data'),
  saveExtractedData: (data) => ipcRenderer.invoke('save-extracted-data', data),
  updateExtractedData: (id, data) => ipcRenderer.invoke('update-extracted-data', id, data),
  deleteExtractedData: (id) => ipcRenderer.invoke('delete-extracted-data', id),
  exportData: (format) => ipcRenderer.invoke('export-data', format),

  // Menu event listeners
  onMenuNewExtraction: (callback) => ipcRenderer.on('menu-new-extraction', callback),
  onMenuExportData: (callback) => ipcRenderer.on('menu-export-data', callback),
  onMenuClearData: (callback) => ipcRenderer.on('menu-clear-data', callback),
  onMenuFindSimilar: (callback) => ipcRenderer.on('menu-find-similar', callback),

  // Browser view communication
  sendToBrowser: (channel, data) => ipcRenderer.send('send-to-browser', channel, data),
  onBrowserMessage: (callback) => ipcRenderer.on('browser-message', callback),

  // System operations
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (path) => require('electron').shell.showItemInFolder(path),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => require('../../package.json').name,
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback),
  onUpdateLog: (callback) => ipcRenderer.on('update-log', callback),

  // Protocol handling
  onProtocolExtract: (callback) => ipcRenderer.on('protocol-extract', callback),
  
  // Auth callback
  onAuthCallback: (callback) => ipcRenderer.on('auth-callback', (event, data) => callback(data)),
  
  // AI Collection callback
  onAICollectionCallback: (callback) => ipcRenderer.on('ai-collection-callback', (event, data) => callback(data)),
  
  // View AI Menu callback
  onViewAIMenu: (callback) => ipcRenderer.on('view-ai-menu', (event, data) => callback(data)),

  // Manual collection handlers
  saveManualMenuItems: (data) => ipcRenderer.invoke('save-manual-menu-items', data),
  getCollectionContext: (data) => ipcRenderer.invoke('get-collection-context', data)
})

// Listen for browser messages and forward them
ipcRenderer.on('browser-data-extracted', (event, data) => {
  window.postMessage({ type: 'BROWSER_DATA_EXTRACTED', data }, '*')
})

ipcRenderer.on('browser-element-selected', (event, data) => {
  window.postMessage({ type: 'BROWSER_ELEMENT_SELECTED', data }, '*')
})

// Handle browser view communication
ipcRenderer.on('send-to-browser', (event, channel, data) => {
  // This will be handled by the browser preload script
})

console.log('Preload script loaded successfully')
