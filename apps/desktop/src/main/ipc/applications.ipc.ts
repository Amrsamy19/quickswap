import { ApplicationService } from '@quickswap/core';
import {
  IPC_CHANNELS,
  RegisterApplicationSchema,
  UpdateApplicationSchema,
} from '@quickswap/shared';
import { secureHandle } from './ipc-security';
import { z } from 'zod';

export function registerApplicationIpcHandlers(): void {
  secureHandle(IPC_CHANNELS.APPLICATIONS_LIST, async () => {
    return ApplicationService.list();
  });

  secureHandle(IPC_CHANNELS.APPLICATIONS_DETECT, async () => {
    return ApplicationService.detectInstalled();
  });

  secureHandle(IPC_CHANNELS.APPLICATIONS_REGISTER, async (_event, input: unknown) => {
    const validated = RegisterApplicationSchema.parse(input);
    return ApplicationService.register(validated);
  });

  secureHandle(IPC_CHANNELS.APPLICATIONS_UPDATE, async (_event, id: unknown, input: unknown) => {
    const validId = z.string().min(1).parse(id);
    const validated = UpdateApplicationSchema.parse(input);
    return ApplicationService.update(validId, validated);
  });

  secureHandle(IPC_CHANNELS.APPLICATIONS_REMOVE, async (_event, id: unknown) => {
    const validId = z.string().min(1).parse(id);
    return ApplicationService.remove(validId);
  });

  secureHandle(IPC_CHANNELS.APPLICATIONS_GET_BY_ID, async (_event, id: unknown) => {
    const validId = z.string().min(1).parse(id);
    return ApplicationService.getById(validId);
  });
}
