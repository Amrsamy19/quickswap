import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

/**
 * Initializes electron-updater for signed releases.
 * Checks for updates in production environments without embedding any secret tokens.
 */
export function initializeAutoUpdater(mainWindow?: BrowserWindow | null): void {
  // Disable in development to avoid spurious network requests
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:update-downloaded', {
        version: info.version,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    // Non-fatal warning if network offline or release repo not yet public
    console.warn(`[AutoUpdater] Note: ${err.message}`);
  });

  try {
    autoUpdater.checkForUpdates().catch(() => {});
  } catch {}
}
