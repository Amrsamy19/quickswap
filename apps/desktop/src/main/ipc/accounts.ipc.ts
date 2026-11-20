import { AccountService } from '@quickswap/core';
import {
  IPC_CHANNELS,
  CreateAccountSchema,
  UpdateAccountSchema,
  AccountFilterSchema,
} from '@quickswap/shared';
import { copySecretWithAutoWipe } from '../clipboard-helper';
import { secureHandle } from './ipc-security';
import { z } from 'zod';

export function registerAccountIpcHandlers(): void {
  secureHandle(IPC_CHANNELS.ACCOUNTS_LIST, async (_event, filter?: unknown) => {
    const validatedFilter = filter ? AccountFilterSchema.parse(filter) : undefined;
    return AccountService.list(validatedFilter);
  });

  secureHandle(IPC_CHANNELS.ACCOUNTS_GET_BY_ID, async (_event, id: unknown) => {
    const validId = z.string().min(1).parse(id);
    return AccountService.getById(validId);
  });

  secureHandle(IPC_CHANNELS.ACCOUNTS_CREATE, async (_event, input: unknown) => {
    const validated = CreateAccountSchema.parse(input);
    return AccountService.create(validated);
  });

  secureHandle(IPC_CHANNELS.ACCOUNTS_UPDATE, async (_event, id: unknown, input: unknown) => {
    const validId = z.string().min(1).parse(id);
    const validated = UpdateAccountSchema.parse(input);
    return AccountService.update(validId, validated);
  });

  secureHandle(IPC_CHANNELS.ACCOUNTS_DELETE, async (_event, id: unknown) => {
    const validId = z.string().min(1).parse(id);
    return AccountService.delete(validId);
  });

  secureHandle(IPC_CHANNELS.ACCOUNTS_SET_DEFAULT, async (_event, id: unknown) => {
    const validId = z.string().min(1).parse(id);
    return AccountService.setDefault(validId);
  });

  secureHandle(IPC_CHANNELS.ACCOUNTS_TOGGLE_FAVORITE, async (_event, id: unknown) => {
    const validId = z.string().min(1).parse(id);
    return AccountService.toggleFavorite(validId);
  });

  secureHandle(IPC_CHANNELS.ACCOUNTS_COPY_PASSWORD, async (_event, id: unknown) => {
    const validId = z.string().min(1).parse(id);
    const cred = await AccountService.getPassword(validId);
    if (!cred || !cred.password) {
      return {
        success: false,
        durationSeconds: 0,
        message: 'No password is saved in Windows Credential Manager for this account.',
      };
    }
    copySecretWithAutoWipe(cred.password, 30000);
    return {
      success: true,
      durationSeconds: 30,
      username: cred.username,
      message: 'Password copied to clipboard. Auto-wiping in 30 seconds.',
    };
  });
}
