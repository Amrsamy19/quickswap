import { ipcMain } from 'electron';
import { AccountService } from '@quickswap/core';
import {
  IPC_CHANNELS,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilter,
} from '@quickswap/shared';
import { copySecretWithAutoWipe } from '../clipboard-helper';

export function registerAccountIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_LIST, async (_event, filter?: AccountFilter) => {
    return AccountService.list(filter);
  });

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_GET_BY_ID, async (_event, id: string) => {
    return AccountService.getById(id);
  });

  ipcMain.handle(
    IPC_CHANNELS.ACCOUNTS_CREATE,
    async (_event, input: CreateAccountInput) => {
      return AccountService.create(input);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.ACCOUNTS_UPDATE,
    async (_event, id: string, input: UpdateAccountInput) => {
      return AccountService.update(id, input);
    }
  );

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_DELETE, async (_event, id: string) => {
    return AccountService.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_SET_DEFAULT, async (_event, id: string) => {
    return AccountService.setDefault(id);
  });

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_TOGGLE_FAVORITE, async (_event, id: string) => {
    return AccountService.toggleFavorite(id);
  });

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_COPY_PASSWORD, async (_event, id: string) => {
    const cred = await AccountService.getPassword(id);
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
