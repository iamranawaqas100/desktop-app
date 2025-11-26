/**
 * Menu Configuration Module (API-Only Architecture)
 * Defines application menu structure
 * Functional approach to menu creation
 */

const { Menu, dialog } = require("electron");
const logger = require("../utils/logger");

/**
 * Create File menu template
 */
const createFileMenu = (mainWindow) => ({
  label: "File",
  submenu: [
    {
      label: "New Extraction",
      accelerator: "CmdOrCtrl+N",
      click: () => mainWindow.webContents.send("menu-new-extraction"),
    },
    {
      label: "Open URL",
      accelerator: "CmdOrCtrl+L",
      click: async () => {
        await dialog.showMessageBox(mainWindow, {
          type: "question",
          title: "Open URL",
          message: "This feature requires the URL input in the main interface.",
          detail: "Please use the URL bar at the top of the application.",
          buttons: ["OK"],
        });
      },
    },
    { type: "separator" },
    {
      label: "Export Data",
      accelerator: "CmdOrCtrl+E",
      click: () => mainWindow.webContents.send("menu-export-data"),
    },
    { type: "separator" },
    {
      label: "Logout",
      accelerator: "CmdOrCtrl+Shift+L",
      click: () => {
        mainWindow.webContents.executeJavaScript(`
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('username');
          localStorage.removeItem('loginTime');
          window.location.href = 'login.html';
        `);
      },
    },
    { type: "separator" },
    {
      label: "Exit",
      accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
      // eslint-disable-next-line global-require
      click: () => require("electron").app.quit(),
    },
  ],
});

/**
 * Create Edit menu template
 */
const createEditMenu = () => ({
  label: "Edit",
  submenu: [
    { role: "undo" },
    { role: "redo" },
    { type: "separator" },
    { role: "cut" },
    { role: "copy" },
    { role: "paste" },
  ],
});

/**
 * Create View menu template
 */
const createViewMenu = () => ({
  label: "View",
  submenu: [
    { role: "reload" },
    { role: "forcereload" },
    { role: "toggledevtools" },
    { type: "separator" },
    { role: "resetzoom" },
    { role: "zoomin" },
    { role: "zoomout" },
    { type: "separator" },
    { role: "togglefullscreen" },
  ],
});

/**
 * Create Tools menu template
 */
const createToolsMenu = (mainWindow) => ({
  label: "Tools",
  submenu: [
    {
      label: "Clear All Data",
      click: () => mainWindow.webContents.send("menu-clear-data"),
    },
    {
      label: "Find Similar Elements",
      accelerator: "CmdOrCtrl+F",
      click: () => mainWindow.webContents.send("menu-find-similar"),
    },
  ],
});

/**
 * Create Help menu template
 */
const createHelpMenu = (mainWindow) => ({
  label: "Help",
  submenu: [
    {
      label: "Check for Updates",
      click: () => {
        try {
          // eslint-disable-next-line global-require
          const { autoUpdater } = require("electron-updater");
          autoUpdater.checkForUpdatesAndNotify();
          dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Update Check",
            message: "Checking for updates...",
            detail: "You will be notified if an update is available.",
          });
        } catch (error) {
          logger.warn("Auto-updater not available:", error.message);
          dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Update Check",
            message: "Auto-update not available in development mode.",
          });
        }
      },
    },
    { type: "separator" },
    {
      label: "About",
      click: () => {
        // eslint-disable-next-line global-require
        const packageInfo = require("../../../package.json");
        const detailText =
          "Professional data collection tool for restaurant menu items." +
          "\n\nBuilt with Electron, React, and Next.js API.";
        dialog.showMessageBox(mainWindow, {
          type: "info",
          title: "About Datassential Collector",
          message: `Datassential Collector v${packageInfo.version}`,
          detail: detailText,
        });
      },
    },
  ],
});

/**
 * Create application menu
 */
const createMenu = (mainWindow) => {
  const template = [
    createFileMenu(mainWindow),
    createEditMenu(),
    createViewMenu(),
    createToolsMenu(mainWindow),
    createHelpMenu(mainWindow),
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  logger.success("Application menu created");
};

module.exports = {
  createMenu,
};
