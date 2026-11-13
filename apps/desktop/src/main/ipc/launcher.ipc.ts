import { ipcMain } from 'electron';
import { LauncherService } from '@accounthub/core';
import { IPC_CHANNELS } from '@accounthub/shared';

export function registerLauncherIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.LAUNCHER_LAUNCH, async (_event, accountId: string, force?: boolean) => {
    return LauncherService.launch(accountId, force);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCHER_GET_STATUS, async (_event, applicationId: string) => {
    return LauncherService.getStatus(applicationId);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCHER_GET_HISTORY, async (_event, limit?: number) => {
    return LauncherService.getHistory(limit);
  });
}
