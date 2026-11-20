import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseConnection } from '@quickswap/database';
import { ApplicationService } from '@quickswap/core';
import { DEFAULT_DATABASE_NAME, LEGACY_DATABASE_NAME } from '@quickswap/shared';
import { registerAllIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function getIconPath(): string | undefined {
  const iconCandidates = [
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(process.resourcesPath || '', 'icon.png'),
    path.resolve(__dirname, '../../resources/icon.ico'),
    path.resolve(__dirname, '../../resources/icon.png'),
    path.resolve(__dirname, '../../dist/icon.ico'),
    path.resolve(__dirname, '../../dist/icon.png'),
    path.resolve(__dirname, '../../dist/favicon.ico'),
    path.resolve(app.getAppPath(), 'resources/icon.ico'),
    path.resolve(app.getAppPath(), 'resources/icon.png'),
    path.resolve(app.getAppPath(), 'dist/icon.ico'),
    path.resolve(app.getAppPath(), 'dist/icon.png'),
    path.resolve(__dirname, '../../../resources/icon.ico'),
    path.resolve(__dirname, '../../../resources/icon.png'),
  ];
  return iconCandidates.find((p) => fs.existsSync(p));
}

function createTray(): void {
  if (tray) return;

  const iconPath = getIconPath();
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();

  try {
    tray = new Tray(iconPath || icon);
    tray.setToolTip('Quickswap - Universal Desktop Account Vault');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Quickswap',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'Minimize to Tray',
        click: () => {
          mainWindow?.hide();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Quickswap',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('[Quickswap] Failed to initialize system tray:', err);
  }
}

function createWindow(): void {
  // Hide standard Electron application menu bar (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0B0F17',
    icon: iconPath,
    frame: false, // Frameless custom window bar for modern gaming/security UI
    autoHideMenuBar: true,
    show: false,
    minimizable: true,
    maximizable: true,
    closable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Security Hardening: Block unauthorized external window open and restrict navigation
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Load dev server or production build
  const devServerUrl = process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow?.loadFile(path.join(__dirname, '../../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Intercept window minimize to hide to tray (notification area)
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  // Keep running in system tray when closed unless explicitly quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 1. Initialize SQLite Database
  const userDataDir = app.getPath('userData');
  const dbPath = path.join(userDataDir, DEFAULT_DATABASE_NAME);
  const legacyDbPath = path.join(userDataDir, LEGACY_DATABASE_NAME);

  // Backward compatibility: migrate legacy accounthub.db if quickswap.db doesn't exist
  if (!fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
    try {
      fs.copyFileSync(legacyDbPath, dbPath);
    } catch {
      // Ignore copy error
    }
  }

  DatabaseConnection.initialize(dbPath);

  // 2. Register Secure IPC Handlers
  registerAllIpcHandlers();

  // 3. Auto-detect installed applications if library is empty
  try {
    const existingApps = ApplicationService.list();
    if (existingApps.length === 0) {
      await ApplicationService.detectInstalled();
    }
  } catch {
    // Ignore initial detection error
  }

  // 4. Initialize System Tray & Main Window
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (isQuitting || process.platform !== 'darwin') {
    DatabaseConnection.close();
    app.quit();
  }
});
