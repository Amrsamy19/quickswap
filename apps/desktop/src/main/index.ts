import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { DatabaseConnection } from '@accounthub/database';
import { ApplicationService } from '@accounthub/core';
import { registerAllIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // Hide standard Electron application menu bar (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0B0F17',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 1. Initialize SQLite Database
  const dbPath = path.join(app.getPath('userData'), 'accounthub.db');
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

  // 4. Create Main Window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    DatabaseConnection.close();
    app.quit();
  }
});
