import { shell } from 'electron';
import { IPC_CHANNELS } from '@quickswap/shared';
import { secureHandle } from './ipc-security';
import {
  checkForUpdatesManually,
  downloadUpdateManually,
  installUpdateManually,
  getUpdateStatus,
} from '../auto-updater';

export function registerUpdaterIpcHandlers(): void {
  secureHandle(IPC_CHANNELS.UPDATER_CHECK_FOR_UPDATES, async () => {
    return checkForUpdatesManually();
  });

  secureHandle(IPC_CHANNELS.UPDATER_DOWNLOAD, async () => {
    return downloadUpdateManually();
  });

  secureHandle(IPC_CHANNELS.UPDATER_INSTALL, () => {
    installUpdateManually();
  });

  secureHandle(IPC_CHANNELS.UPDATER_GET_STATUS, () => {
    return getUpdateStatus();
  });

  secureHandle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    // Only allow verified GitHub repository URLs for security
    if (typeof url === 'string' && url.startsWith('https://github.com/Amrsamy19/quickswap')) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });
}
