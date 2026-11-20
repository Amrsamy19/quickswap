import { BackupService, LegacyMigrationService } from '@quickswap/core';
import { IPC_CHANNELS } from '@quickswap/shared';
import { secureHandle } from './ipc-security';
import { z } from 'zod';

export function registerBackupAndMigrationIpcHandlers(): void {
  // 1. Encrypted Backup Export
  secureHandle(
    IPC_CHANNELS.BACKUP_EXPORT,
    async (_event, passphrase: unknown, outputPath: unknown) => {
      const validPass = z.string().min(6).max(200).parse(passphrase);
      const validPath = z.string().min(1).parse(outputPath);
      return BackupService.exportBackup(validPass, validPath);
    }
  );

  // 2. Encrypted Backup Inspect / Preview
  secureHandle(
    IPC_CHANNELS.BACKUP_INSPECT,
    async (_event, passphrase: unknown, filePath: unknown) => {
      const validPass = z.string().min(1).max(200).parse(passphrase);
      const validPath = z.string().min(1).parse(filePath);
      return BackupService.inspectBackup(validPass, validPath);
    }
  );

  // 3. Encrypted Backup Restore
  secureHandle(
    IPC_CHANNELS.BACKUP_RESTORE,
    async (_event, passphrase: unknown, filePath: unknown, conflictStrategy: unknown) => {
      const validPass = z.string().min(1).max(200).parse(passphrase);
      const validPath = z.string().min(1).parse(filePath);
      const validStrategy = z.enum(['overwrite', 'skip', 'keep_both']).default('overwrite').parse(conflictStrategy);
      return BackupService.restoreBackup(validPass, validPath, validStrategy);
    }
  );

  // 4. Legacy AccountHub Migration Status
  secureHandle(IPC_CHANNELS.LEGACY_MIGRATION_GET_STATUS, async () => {
    return LegacyMigrationService.getStatus();
  });

  // 5. Run Legacy Migration
  secureHandle(IPC_CHANNELS.LEGACY_MIGRATION_RUN, async () => {
    return LegacyMigrationService.migrate();
  });

  // 6. Cleanup Legacy Migration Data
  secureHandle(IPC_CHANNELS.LEGACY_MIGRATION_CLEANUP, async () => {
    return LegacyMigrationService.cleanupLegacyData();
  });
}
