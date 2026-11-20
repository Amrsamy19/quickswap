import { LauncherService, AccountService } from '@quickswap/core';
import { IPC_CHANNELS } from '@quickswap/shared';
import { copySecretWithAutoWipe } from '../clipboard-helper';
import { secureHandle } from './ipc-security';
import { z } from 'zod';

export function registerLauncherIpcHandlers(): void {
  secureHandle(IPC_CHANNELS.LAUNCHER_LAUNCH, async (_event, accountId: unknown, force?: unknown) => {
    const validAccountId = z.string().min(1).parse(accountId);
    const validForce = force !== undefined ? z.boolean().parse(force) : false;

    const result = await LauncherService.launch(validAccountId, validForce);

    // If Riot/App requested password copy for manual login assist
    if (result.copiedPassword) {
      try {
        const cred = await AccountService.getPassword(validAccountId);
        if (cred?.password) {
          copySecretWithAutoWipe(cred.password, 30000);
        }
      } catch {
        // Continue
      }
    }

    return result;
  });

  secureHandle(IPC_CHANNELS.LAUNCHER_GET_STATUS, async (_event, applicationId: unknown) => {
    const validAppId = z.string().min(1).parse(applicationId);
    return LauncherService.getStatus(validAppId);
  });

  secureHandle(IPC_CHANNELS.LAUNCHER_GET_HISTORY, async (_event, limit?: unknown) => {
    const validLimit = limit !== undefined ? z.number().int().min(1).max(500).parse(limit) : 50;
    return LauncherService.getHistory(validLimit);
  });

  secureHandle(IPC_CHANNELS.LAUNCHER_CAPTURE_SESSION, async (_event, accountId: unknown) => {
    const validAccountId = z.string().min(1).parse(accountId);
    return LauncherService.captureSession(validAccountId);
  });

  secureHandle(IPC_CHANNELS.LAUNCHER_HAS_SESSION, async (_event, accountId: unknown) => {
    const validAccountId = z.string().min(1).parse(accountId);
    return LauncherService.hasSession(validAccountId);
  });

  secureHandle(IPC_CHANNELS.LAUNCHER_CLEAR_SESSION, async (_event, accountId: unknown) => {
    const validAccountId = z.string().min(1).parse(accountId);
    return LauncherService.clearSession(validAccountId);
  });

  secureHandle(IPC_CHANNELS.LAUNCHER_AUTO_LOGIN, async (_event, accountId: unknown) => {
    const validAccountId = z.string().min(1).parse(accountId);
    return LauncherService.autoLogin(validAccountId);
  });
}
