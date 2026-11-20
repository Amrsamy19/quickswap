import { ipcMain } from 'electron';
import { CoreSecurityService } from '@quickswap/core';
import {
  IPC_CHANNELS,
  SetMasterPasswordSchema,
  UnlockVaultSchema,
  RemoveMasterPasswordSchema,
} from '@quickswap/shared';

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

  ipcMain.handle(IPC_CHANNELS.SECURITY_GET_LOCK_STATUS, async () => {
    return CoreSecurityService.getLockStatus();
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY_SET_MASTER_PASSWORD, async (_event, password: string) => {
    const validated = SetMasterPasswordSchema.parse({ password });
    return CoreSecurityService.setMasterPassword(validated.password);
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY_UNLOCK_VAULT, async (_event, password: string) => {
    const validated = UnlockVaultSchema.parse({ password });
    return CoreSecurityService.unlockVault(validated.password);
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY_LOCK_VAULT, async () => {
    return CoreSecurityService.lockVault();
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY_REMOVE_MASTER_PASSWORD, async (_event, password: string) => {
    const validated = RemoveMasterPasswordSchema.parse({ password });
    return CoreSecurityService.removeMasterPassword(validated.password);
  });
}
