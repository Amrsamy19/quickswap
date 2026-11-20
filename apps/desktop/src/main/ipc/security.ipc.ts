import { CoreSecurityService } from '@quickswap/core';
import {
  IPC_CHANNELS,
  SetMasterPasswordSchema,
  UnlockVaultSchema,
  RemoveMasterPasswordSchema,
  ChangeMasterPasswordSchema,
  ResetVaultSchema,
} from '@quickswap/shared';
import { secureHandle } from './ipc-security';
import { z } from 'zod';

export function registerSecurityIpcHandlers(): void {
  secureHandle(IPC_CHANNELS.SECURITY_GET_STATUS, async () => {
    return CoreSecurityService.getStatus();
  });

  secureHandle(IPC_CHANNELS.SECURITY_LIST_CREDENTIALS, async () => {
    return CoreSecurityService.listStoredCredentials();
  });

  secureHandle(IPC_CHANNELS.SECURITY_VERIFY_INTEGRITY, async () => {
    return CoreSecurityService.verifyIntegrity();
  });

  secureHandle(IPC_CHANNELS.SECURITY_GET_LOCK_STATUS, async () => {
    return CoreSecurityService.getLockStatus();
  });

  secureHandle(IPC_CHANNELS.SECURITY_SET_MASTER_PASSWORD, async (_event, password: unknown) => {
    const validated = SetMasterPasswordSchema.parse({ password });
    return CoreSecurityService.setMasterPassword(validated.password);
  });

  secureHandle(IPC_CHANNELS.SECURITY_UNLOCK_VAULT, async (_event, password: unknown) => {
    const validated = UnlockVaultSchema.parse({ password });
    return CoreSecurityService.unlockVault(validated.password);
  });

  secureHandle(IPC_CHANNELS.SECURITY_LOCK_VAULT, async () => {
    return CoreSecurityService.lockVault();
  });

  secureHandle(IPC_CHANNELS.SECURITY_REMOVE_MASTER_PASSWORD, async (_event, password: unknown) => {
    const validated = RemoveMasterPasswordSchema.parse({ password });
    return CoreSecurityService.removeMasterPassword(validated.password);
  });

  secureHandle(IPC_CHANNELS.SECURITY_CHANGE_MASTER_PASSWORD, async (_event, currentPassword: unknown, newPassword: unknown) => {
    const validated = ChangeMasterPasswordSchema.parse({ currentPassword, newPassword });
    return CoreSecurityService.changeMasterPassword(validated.currentPassword, validated.newPassword);
  });

  secureHandle(IPC_CHANNELS.SECURITY_RESET_VAULT, async (_event, confirmation: unknown) => {
    const validated = ResetVaultSchema.parse({ confirmation });
    return CoreSecurityService.resetVault(validated.confirmation);
  });

  secureHandle(IPC_CHANNELS.SECURITY_VERIFY_AUDIT_LOG, async () => {
    return CoreSecurityService.verifyAuditLog();
  });
}
