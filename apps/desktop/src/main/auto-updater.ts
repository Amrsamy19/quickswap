import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import https from 'https';
import { UpdateStatusData, IPC_CHANNELS } from '@quickswap/shared';
import { prepareForAppQuitOrUpdate, isPortableExecutable } from './lifecycle';

export { isPortableExecutable };

let activeMainWindow: BrowserWindow | null = null;
let lastCheckTimestamp = 0;

let currentStatus: UpdateStatusData = {
  status: 'idle',
  currentVersion: app.getVersion(),
  isPortable: isPortableExecutable(),
};

export function getUpdateStatus(): UpdateStatusData {
  return { ...currentStatus, currentVersion: app.getVersion(), isPortable: isPortableExecutable() };
}

export function broadcastStatus(status: UpdateStatusData): void {
  currentStatus = { ...status, isPortable: isPortableExecutable() };
  if (activeMainWindow && !activeMainWindow.isDestroyed()) {
    activeMainWindow.webContents.send(IPC_CHANNELS.UPDATER_STATUS_CHANGED, currentStatus);
  }
}

function compareSemVer(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').split('.').map(Number);
  const clean2 = v2.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
    const num1 = clean1[i] || 0;
    const num2 = clean2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Checks GitHub Releases API in development mode where electron-updater cannot run unpackaged.
 */
async function checkGitHubReleasesDev(): Promise<UpdateStatusData> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/Amrsamy19/quickswap/releases/latest',
      headers: {
        'User-Agent': 'Quickswap-Desktop-Dev',
      },
      timeout: 5000,
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const release = JSON.parse(data);
            const latestTag = release.tag_name || '';
            const cleanTag = latestTag.replace(/^v/, '');
            const currentVer = app.getVersion();

            if (compareSemVer(cleanTag, currentVer) > 0) {
              const result: UpdateStatusData = {
                status: 'available',
                currentVersion: currentVer,
                availableVersion: cleanTag,
                releaseDate: release.published_at,
                releaseNotes: release.body,
                isPortable: isPortableExecutable(),
              };
              broadcastStatus(result);
              return resolve(result);
            } else {
              const result: UpdateStatusData = {
                status: 'not-available',
                currentVersion: currentVer,
                isPortable: isPortableExecutable(),
              };
              broadcastStatus(result);
              return resolve(result);
            }
          } else {
            const result: UpdateStatusData = {
              status: 'not-available',
              currentVersion: app.getVersion(),
              isPortable: isPortableExecutable(),
            };
            broadcastStatus(result);
            return resolve(result);
          }
        } catch {
          const result: UpdateStatusData = {
            status: 'not-available',
            currentVersion: app.getVersion(),
            isPortable: isPortableExecutable(),
          };
          broadcastStatus(result);
          return resolve(result);
        }
      });
    });

    req.on('error', (err) => {
      const result: UpdateStatusData = {
        status: 'error',
        currentVersion: app.getVersion(),
        error: `Network check failed: ${err.message}`,
        isPortable: isPortableExecutable(),
      };
      broadcastStatus(result);
      resolve(result);
    });

    req.on('timeout', () => {
      req.destroy();
      const result: UpdateStatusData = {
        status: 'error',
        currentVersion: app.getVersion(),
        error: 'Network check timed out.',
        isPortable: isPortableExecutable(),
      };
      broadcastStatus(result);
      resolve(result);
    });
  });
}

function sanitizeUpdaterError(rawError?: string): string {
  if (!rawError) return 'Failed to check for updates';
  if (rawError.includes('404') && (rawError.includes('releases.atom') || rawError.includes('authentication token'))) {
    return 'Unable to access releases: The GitHub repository (Amrsamy19/quickswap) is currently Private. GitHub requires the repository to be Public for unauthenticated desktop auto-updates.';
  }
  if (rawError.includes('net::ERR_INTERNET_DISCONNECTED') || rawError.includes('ENOTFOUND') || rawError.includes('ETIMEDOUT')) {
    return 'No internet connection detected. Please verify your network and retry.';
  }
  const firstLine = rawError.split('\n')[0].trim();
  return firstLine.length > 150 ? `${firstLine.slice(0, 150)}...` : firstLine;
}

/**
 * Initializes electron-updater for signed releases.
 */
export function initializeAutoUpdater(
  mainWindow?: BrowserWindow | null,
  settings?: { autoCheckUpdates?: boolean }
): void {
  if (mainWindow) {
    activeMainWindow = mainWindow;
  }

  // Configure electron-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    broadcastStatus({
      status: 'checking',
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('update-available', (info) => {
    broadcastStatus({
      status: 'available',
      currentVersion: app.getVersion(),
      availableVersion: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    });
  });

  autoUpdater.on('update-not-available', () => {
    broadcastStatus({
      status: 'not-available',
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    broadcastStatus({
      status: 'downloading',
      currentVersion: app.getVersion(),
      availableVersion: currentStatus.availableVersion,
      progress: {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      },
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastStatus({
      status: 'downloaded',
      currentVersion: app.getVersion(),
      availableVersion: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    console.warn(`[AutoUpdater] Note: ${err.message}`);
    broadcastStatus({
      status: 'error',
      currentVersion: app.getVersion(),
      error: sanitizeUpdaterError(err.message),
    });
  });

  // Only auto-check on startup if enabled in settings
  if (settings?.autoCheckUpdates !== false) {
    setTimeout(() => {
      checkForUpdatesManually().catch(() => {});
    }, 4000);
  }
}

/**
 * Manually initiates an update check.
 */
export async function checkForUpdatesManually(): Promise<UpdateStatusData> {
  const now = Date.now();
  if (now - lastCheckTimestamp < 3000 && currentStatus.status === 'checking') {
    return currentStatus;
  }
  lastCheckTimestamp = now;

  broadcastStatus({
    status: 'checking',
    currentVersion: app.getVersion(),
  });

  // In development, query GitHub API safely without electron-updater's unpackaged error
  if (!app.isPackaged || process.env.NODE_ENV === 'development') {
    return checkGitHubReleasesDev();
  }

  try {
    await autoUpdater.checkForUpdates();
    return currentStatus;
  } catch (err: any) {
    const errorStatus: UpdateStatusData = {
      status: 'error',
      currentVersion: app.getVersion(),
      error: sanitizeUpdaterError(err?.message),
      isPortable: isPortableExecutable(),
    };
    broadcastStatus(errorStatus);
    return errorStatus;
  }
}

/**
 * Manually starts downloading the available update.
 */
export async function downloadUpdateManually(): Promise<{ success: boolean; message?: string }> {
  if (isPortableExecutable()) {
    return {
      success: false,
      message: 'Portable version cannot be auto-updated in place. Please download the portable binary from GitHub.',
    };
  }

  if (!app.isPackaged) {
    return {
      success: false,
      message: 'Automatic download is disabled in development mode.',
    };
  }

  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err: any) {
    broadcastStatus({
      status: 'error',
      currentVersion: app.getVersion(),
      error: `Download failed: ${err?.message || 'Unknown error'}`,
    });
    return { success: false, message: err?.message };
  }
}

/**
 * Safely prepares the application (locks vault, closes DB) and restarts to apply update.
 */
export function installUpdateManually(): void {
  prepareForAppQuitOrUpdate();
  autoUpdater.quitAndInstall(false, true);
}
