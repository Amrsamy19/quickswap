import fs from 'fs';
import path from 'path';
import { CredentialVault, NativeBridge } from '@quickswap/security';
import { SettingsRepository, DatabaseConnection } from '@quickswap/database';
import { ActivityService } from '../activity/service';

export interface LegacyMigrationStatus {
  legacyFolderFound: boolean;
  legacyFolderPath: string | null;
  legacyDbFound: boolean;
  legacyCredentialCount: number;
  migrationCompleted: boolean;
  migrationDate: string | null;
}

export class LegacyMigrationService {
  private static readonly SETTING_MIGRATION_COMPLETED = 'legacy_migration_completed';
  private static readonly SETTING_MIGRATION_DATE = 'legacy_migration_date';

  /**
   * Resolves the potential legacy AccountHub application data paths on Windows.
   */
  public static getLegacyAppDataDir(): string {
    const appData = process.env.APPDATA || '';
    return path.join(appData, 'AccountHub');
  }

  public static getLegacyDbPath(): string {
    return path.join(this.getLegacyAppDataDir(), 'accounthub.db');
  }

  /**
   * Checks for the presence of legacy AccountHub data (userData folder, SQLite DB, Credential Manager targets).
   */
  public static async getStatus(): Promise<LegacyMigrationStatus> {
    const legacyDir = this.getLegacyAppDataDir();
    const legacyDb = this.getLegacyDbPath();

    const folderExists = fs.existsSync(legacyDir);
    const dbExists = fs.existsSync(legacyDb);

    let credCount = 0;
    try {
      const creds = await CredentialVault.listAccountHubCredentials();
      credCount = creds.length;
    } catch {
      credCount = 0;
    }

    const completed = SettingsRepository.getRaw(this.SETTING_MIGRATION_COMPLETED) === 'true';
    const migrationDate = SettingsRepository.getRaw(this.SETTING_MIGRATION_DATE);

    return {
      legacyFolderFound: folderExists,
      legacyFolderPath: folderExists ? legacyDir : null,
      legacyDbFound: dbExists,
      legacyCredentialCount: credCount,
      migrationCompleted: completed,
      migrationDate,
    };
  }

  /**
   * Safely migrates legacy AccountHub database and credentials to Quickswap.
   * Keeps original files and AccountHub/* credentials untouched for zero-data-loss safety.
   */
  public static async migrate(currentDbPath?: string): Promise<{
    migratedDatabase: boolean;
    migratedCredentials: number;
    message: string;
  }> {
    let migratedDb = false;
    let migratedCreds = 0;

    const legacyDb = this.getLegacyDbPath();

    // 1. Migrate database if destination is new/empty and legacy DB exists
    if (currentDbPath && fs.existsSync(legacyDb) && !fs.existsSync(currentDbPath)) {
      try {
        const destDir = path.dirname(currentDbPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(legacyDb, currentDbPath);
        migratedDb = true;
      } catch (err: any) {
        console.warn(`[LegacyMigration] Failed to copy legacy database: ${err.message}`);
      }
    }

    // 2. Migrate Windows Credential Manager targets from AccountHub/* to Quickswap/*
    try {
      const legacyCreds = await CredentialVault.listAccountHubCredentials();
      for (const cred of legacyCreds) {
        // Target format: "AccountHub/<accountId>/<type>"
        const parts = cred.target.split('/');
        if (parts.length >= 3 && parts[0] === 'AccountHub') {
          const accountId = parts[1];
          const secretType = parts[2] || 'password';

          // Read plaintext password from legacy target
          const existing = await CredentialVault.getCredential(accountId, secretType);
          if (existing && existing.password) {
            // Write to modern Quickswap/<accountId>/<type> target
            await CredentialVault.saveCredential(
              accountId,
              existing.username || cred.username || '',
              existing.password,
              secretType
            );
            migratedCreds++;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[LegacyMigration] Credential target migration note: ${err.message}`);
    }

    // 3. Record migration status
    SettingsRepository.setRaw(this.SETTING_MIGRATION_COMPLETED, 'true');
    SettingsRepository.setRaw(this.SETTING_MIGRATION_DATE, new Date().toISOString());

    ActivityService.log(
      'system_startup',
      'system',
      null,
      'Legacy Migration Completed',
      `Migrated ${migratedCreds} credentials from AccountHub to Quickswap (originals retained for safety).`
    );

    return {
      migratedDatabase: migratedDb,
      migratedCredentials: migratedCreds,
      message: `Migration finished: ${migratedCreds} credentials copied to Quickswap namespace. Original AccountHub files retained safely.`,
    };
  }

  /**
   * Explicit cleanup action: purges legacy AccountHub/* credential targets and archives/deletes
   * the legacy userData folder only when explicitly confirmed by the user.
   */
  public static async cleanupLegacyData(): Promise<{
    cleanedCredentials: number;
    cleanedFolder: boolean;
    message: string;
  }> {
    let cleanedCreds = 0;
    let cleanedFolder = false;

    // 1. Purge legacy AccountHub/* credentials
    try {
      const legacyCreds = await CredentialVault.listAccountHubCredentials();
      for (const cred of legacyCreds) {
        if (cred.target.startsWith('AccountHub/')) {
          await NativeBridge.execute('cred-delete', [cred.target]);
          cleanedCreds++;
        }
      }
    } catch {}

    // 2. Archive or clean legacy folder
    const legacyDir = this.getLegacyAppDataDir();
    if (fs.existsSync(legacyDir)) {
      try {
        const archiveDir = `${legacyDir}.archived-${Date.now()}`;
        fs.renameSync(legacyDir, archiveDir);
        cleanedFolder = true;
      } catch {
        // If rename fails, try unlinking database
        try {
          const dbPath = this.getLegacyDbPath();
          if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
          cleanedFolder = true;
        } catch {}
      }
    }

    ActivityService.log(
      'security_event',
      'security',
      null,
      'Legacy AccountHub Data Cleaned',
      `Purged ${cleanedCreds} legacy credential targets and cleaned old AppData.`
    );

    return {
      cleanedCredentials: cleanedCreds,
      cleanedFolder,
      message: `Cleaned up ${cleanedCreds} legacy AccountHub credential targets.`,
    };
  }
}
