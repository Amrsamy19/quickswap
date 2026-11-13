import { ipcMain } from 'electron';
import { ActivityService, AppSettingsService } from '@accounthub/core';
import { IPC_CHANNELS, UpdateSettingsInput } from '@accounthub/shared';

export function registerActivityIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ACTIVITY_LIST, async (_event, limit?: number) => {
    return ActivityService.list(limit);
  });

  ipcMain.handle(IPC_CHANNELS.ACTIVITY_CLEAR, async () => {
    return ActivityService.clear();
  });
}

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return AppSettingsService.get();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_event, input: UpdateSettingsInput) => {
      return AppSettingsService.update(input);
    }
  );
}
