import { ActivityService, AppSettingsService } from '@quickswap/core';
import { IPC_CHANNELS, UpdateSettingsSchema } from '@quickswap/shared';
import { secureHandle } from './ipc-security';
import { z } from 'zod';

export function registerActivityIpcHandlers(): void {
  secureHandle(IPC_CHANNELS.ACTIVITY_LIST, async (_event, limit?: unknown) => {
    const validLimit = limit !== undefined ? z.number().int().min(1).max(500).parse(limit) : 50;
    return ActivityService.list(validLimit);
  });

  secureHandle(IPC_CHANNELS.ACTIVITY_CLEAR, async () => {
    return ActivityService.clear();
  });
}

export function registerSettingsIpcHandlers(): void {
  secureHandle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return AppSettingsService.get();
  });

  secureHandle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, input: unknown) => {
    const validated = UpdateSettingsSchema.parse(input);
    return AppSettingsService.update(validated);
  });
}
