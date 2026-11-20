import { ipcMain } from 'electron';
import { LauncherService, AccountService } from '@quickswap/core';
import { IPC_CHANNELS } from '@quickswap/shared';
import { copySecretWithAutoWipe } from '../clipboard-helper';

export function registerLauncherIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.LAUNCHER_LAUNCH, async (_event, accountId: string, force?: boolean) => {
    const result = await LauncherService.launch(accountId, force);

    // If Riot/App requested password copy for manual login assist
    if (result.copiedPassword) {
      try {
        const cred = await AccountService.getPassword(accountId);
        if (cred?.password) {
          copySecretWithAutoWipe(cred.password, 30000);
        }
      } catch {
        // Continue
      }
    }

    return result;
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCHER_GET_STATUS, async (_event, applicationId: string) => {
    return LauncherService.getStatus(applicationId);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCHER_GET_HISTORY, async (_event, limit?: number) => {
    return LauncherService.getHistory(limit);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCHER_CAPTURE_SESSION, async (_event, accountId: string) => {
    return LauncherService.captureSession(accountId);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCHER_HAS_SESSION, async (_event, accountId: string) => {
    return LauncherService.hasSession(accountId);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCHER_CLEAR_SESSION, async (_event, accountId: string) => {
    return LauncherService.clearSession(accountId);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCHER_AUTO_LOGIN, async (_event, accountId: string) => {
    return LauncherService.autoLogin(accountId);
  });
}
