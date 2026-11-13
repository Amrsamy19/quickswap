import { ipcMain } from 'electron';
import { CoreSecurityService } from '@accounthub/core';
import { IPC_CHANNELS } from '@accounthub/shared';

export function registerSecurityIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SECURITY_GET_STATUS, async () => {
    return CoreSecurityService.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY_LIST_CREDENTIALS, async () => {
    return CoreSecurityService.listStoredCredentials();
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY_VERIFY_INTEGRITY, async () => {
    return CoreSecurityService.verifyIntegrity();
  });
}
