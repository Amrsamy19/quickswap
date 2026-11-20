import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  deriveKek,
  aesGcmEncrypt,
  aesGcmDecrypt,
  EncryptedEnvelope,
  CredentialVault,
  VaultGate,
  DEFAULT_PBKDF2_ITERATIONS,
  KEY_LENGTH_BYTES,
  SALT_LENGTH_BYTES,
} from '@quickswap/security';
import {
  ApplicationsRepository,
  AccountsRepository,
  AccountSecretsRepository,
  SettingsRepository,
  ActivityLogRepository,
  DatabaseConnection,
  MigrationRunner,
} from '@quickswap/database';
import {
  Application,
  Account,
  ActivityLogEntry,
  AppError,
} from '@quickswap/shared';
import { AccountService } from '../accounts/service';
import { ActivityService } from '../activity/service';

export const BACKUP_MAGIC_HEADER = 'QUICKSWAP_ENCRYPTED_BACKUP_V1';

export interface BackupMetadata {
  version: number;
  kdf: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  iv: string;
  tag: string;
  checksum: string;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  appVersion: string;
  applications: Application[];
  accounts: Array<Account & { password?: string }>;
  activityLogs: ActivityLogEntry[];
  settings: Record<string, string>;
}

export interface BackupPreview {
  valid: boolean;
  version: number;
  exportedAt: string;
  accountsCount: number;
  applicationsCount: number;
  accounts: Array<{ id: string; displayName: string; username?: string | null; appName: string }>;
  applications: Array<{ id: string; name: string }>;
}

export interface RestoreResult {
  success: boolean;
  accountsRestored: number;
  applicationsRestored: number;
  message: string;
}

export class BackupService {
  /**
   * Exports an encrypted, passphrase-protected backup file.
   * Container format:
   * Line 1: QUICKSWAP_ENCRYPTED_BACKUP_V1
   * Line 2: JSON metadata (version, kdf, salt, iv, tag, checksum)
   * Line 3: Hex ciphertext
   */
  public static async exportBackup(
    passphrase: string,
    outputPath: string
  ): Promise<{ success: boolean; filePath: string; accountsCount: number }> {
    if (!passphrase || passphrase.length < 6) {
      throw new AppError('INVALID_INPUT', 'Backup passphrase must be at least 6 characters long.');
    }

    // 1. Gather all applications
    const applications = ApplicationsRepository.list();

    // 2. Gather accounts with decrypted passwords (if available)
    const rawAccounts = AccountsRepository.list();
    const accountsWithPasswords: Array<Account & { password?: string }> = [];

    for (const acc of rawAccounts) {
      let password: string | undefined = undefined;
      try {
        const cred = await CredentialVault.getCredential(acc.id, 'password');
        if (cred?.password) {
          password = cred.password;
        }
      } catch {}

      // Decrypt metadata if vault is unlocked
      const decryptedAcc = AccountService.getById(acc.id) || acc;

      accountsWithPasswords.push({
        ...decryptedAcc,
        password,
      });
    }

    // 3. Gather activity logs and settings
    const activityLogs = ActivityLogRepository.list(500);
    const settings = SettingsRepository.getAllRaw();

    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      applications,
      accounts: accountsWithPasswords,
      activityLogs,
      settings,
    };

    const payloadJson = JSON.stringify(payload);

    // 4. Derive KEK via PBKDF2-SHA256 (600,000 iterations)
    const salt = crypto.randomBytes(SALT_LENGTH_BYTES);
    const iterations = DEFAULT_PBKDF2_ITERATIONS;
    const kek = deriveKek(passphrase, salt, iterations, KEY_LENGTH_BYTES);

    // 5. Encrypt with AES-256-GCM
    const envelope = aesGcmEncrypt(payloadJson, kek);
    kek.fill(0);

    // 6. Compute SHA-256 checksum of the ciphertext for tamper verification
    const checksum = crypto
      .createHash('sha256')
      .update(envelope.ciphertext)
      .digest('hex');

    const metadata: BackupMetadata = {
      version: 1,
      kdf: 'pbkdf2-sha256',
      iterations,
      salt: salt.toString('hex'),
      iv: envelope.iv,
      tag: envelope.tag,
      checksum,
    };

    // 7. Assemble file container
    const fileContent = `${BACKUP_MAGIC_HEADER}\n${JSON.stringify(metadata)}\n${envelope.ciphertext}`;

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, fileContent, 'utf8');

    ActivityService.log(
      'security_event',
      'security',
      null,
      'Encrypted Backup Created',
      `Exported vault backup with ${accountsWithPasswords.length} accounts to "${path.basename(outputPath)}"`
    );

    return {
      success: true,
      filePath: outputPath,
      accountsCount: accountsWithPasswords.length,
    };
  }

  /**
   * Reads, verifies, and previews the contents of an encrypted backup without applying it to the database.
   */
  public static async inspectBackup(
    passphrase: string,
    backupFilePath: string
  ): Promise<BackupPreview> {
    const payload = await this.decryptBackupFile(passphrase, backupFilePath);

    const appMap = new Map(payload.applications.map((a) => [a.id, a.name]));

    const accountsPreview = payload.accounts.map((acc) => ({
      id: acc.id,
      displayName: acc.displayName,
      username: acc.username,
      appName: appMap.get(acc.applicationId) || 'Unknown Application',
    }));

    const applicationsPreview = payload.applications.map((app) => ({
      id: app.id,
      name: app.name,
    }));

    return {
      valid: true,
      version: payload.version,
      exportedAt: payload.exportedAt,
      accountsCount: payload.accounts.length,
      applicationsCount: payload.applications.length,
      accounts: accountsPreview,
      applications: applicationsPreview,
    };
  }

  /**
   * Restores an encrypted backup into the database and Windows Credential Manager.
   * Automatically takes a backup snapshot of the SQLite database prior to applying changes.
   */
  public static async restoreBackup(
    passphrase: string,
    backupFilePath: string,
    conflictStrategy: 'overwrite' | 'skip' | 'keep_both' = 'overwrite'
  ): Promise<RestoreResult> {
    const payload = await this.decryptBackupFile(passphrase, backupFilePath);

    // 1. Take safety snapshot of current database
    try {
      const db = DatabaseConnection.getInstance();
      const currentPath = (db as any).filename || '';
      if (currentPath && currentPath !== ':memory:') {
        MigrationRunner.backupDatabase(currentPath);
      }
    } catch {}

    let appsRestored = 0;
    let accountsRestored = 0;

    // 2. Restore applications
    for (const app of payload.applications) {
      const existing = ApplicationsRepository.getById(app.id);
      if (!existing) {
        ApplicationsRepository.create({
          id: app.id,
          name: app.name,
          adapterId: app.adapterId,
          executablePath: app.executablePath,
          installPath: app.installPath,
          iconPath: app.iconPath,
          category: app.category,
          isFavorite: app.isFavorite,
        });
        appsRestored++;
      } else if (conflictStrategy === 'overwrite') {
        ApplicationsRepository.update(app.id, {
          name: app.name,
          executablePath: app.executablePath,
          installPath: app.installPath,
          iconPath: app.iconPath,
          category: app.category,
          isFavorite: app.isFavorite,
        });
        appsRestored++;
      }
    }

    // 3. Restore accounts and credentials
    for (const acc of payload.accounts) {
      const existing = AccountsRepository.getById(acc.id);
      let targetAccountId = acc.id;

      if (existing) {
        if (conflictStrategy === 'skip') {
          continue;
        } else if (conflictStrategy === 'keep_both') {
          targetAccountId = `acc-${crypto.randomUUID()}`;
        }
      }

      if (existing && conflictStrategy === 'overwrite') {
        AccountsRepository.update(acc.id, {
          displayName: acc.displayName,
          username: acc.username,
          region: acc.region,
          avatar: acc.avatar,
          authMethod: acc.authMethod,
          isFavorite: acc.isFavorite,
          isDefault: acc.isDefault,
          launchArguments: acc.launchArguments,
        });
      } else {
        AccountsRepository.create({
          id: targetAccountId,
          applicationId: acc.applicationId,
          displayName: acc.displayName,
          username: acc.username,
          region: acc.region,
          avatar: acc.avatar,
          authMethod: acc.authMethod,
          isFavorite: acc.isFavorite,
          isDefault: acc.isDefault,
          launchArguments: acc.launchArguments,
        });
      }

      // Restore credentials in Windows Credential Manager if present in backup
      if (acc.password) {
        try {
          const target = await CredentialVault.saveCredential(
            targetAccountId,
            acc.username || acc.displayName,
            acc.password,
            'password'
          );

          AccountSecretsRepository.saveReference({
            id: `sec-${crypto.randomUUID()}`,
            accountId: targetAccountId,
            secretType: 'password',
            credentialRef: target,
          });
        } catch (err: any) {
          console.warn(`[BackupService] Failed to restore credential for ${acc.displayName}: ${err.message}`);
        }
      }

      accountsRestored++;
    }

    ActivityService.log(
      'security_event',
      'security',
      null,
      'Vault Backup Restored',
      `Restored ${accountsRestored} accounts and ${appsRestored} applications from backup.`
    );

    return {
      success: true,
      accountsRestored,
      applicationsRestored: appsRestored,
      message: `Successfully restored ${accountsRestored} accounts and ${appsRestored} applications.`,
    };
  }

  /**
   * Internal helper to decrypt and authenticate a backup file.
   */
  private static async decryptBackupFile(
    passphrase: string,
    backupFilePath: string
  ): Promise<BackupPayload> {
    if (!fs.existsSync(backupFilePath)) {
      throw new AppError('INVALID_INPUT', `Backup file was not found at "${backupFilePath}".`);
    }

    const content = fs.readFileSync(backupFilePath, 'utf8');
    const lines = content.split('\n');
    if (lines.length < 3 || lines[0].trim() !== BACKUP_MAGIC_HEADER) {
      throw new AppError('INVALID_INPUT', 'Invalid or corrupt backup file format. Magic header missing.');
    }

    let metadata: BackupMetadata;
    try {
      metadata = JSON.parse(lines[1]);
    } catch {
      throw new AppError('INVALID_INPUT', 'Corrupted backup file metadata header.');
    }

    const ciphertext = lines[2].trim();

    // 1. Verify SHA-256 integrity checksum
    const computedChecksum = crypto
      .createHash('sha256')
      .update(ciphertext)
      .digest('hex');

    if (computedChecksum.toLowerCase() !== metadata.checksum.toLowerCase()) {
      throw new AppError(
        'SECURITY_VAULT_ERROR',
        'Backup file integrity check failed. The file has been modified or corrupted.'
      );
    }

    // 2. Derive KEK from backup passphrase
    const salt = Buffer.from(metadata.salt, 'hex');
    const kek = deriveKek(passphrase, salt, metadata.iterations, KEY_LENGTH_BYTES);

    // 3. Decrypt ciphertext and authenticate GCM tag
    try {
      const envelope: EncryptedEnvelope = {
        algo: 'aes-256-gcm',
        iv: metadata.iv,
        tag: metadata.tag,
        ciphertext,
      };

      const decrypted = aesGcmDecrypt(envelope, kek);
      kek.fill(0);

      const payload: BackupPayload = JSON.parse(decrypted.toString('utf8'));
      if (payload.version !== 1 || !Array.isArray(payload.accounts) || !Array.isArray(payload.applications)) {
        throw new Error('Malformed payload structure');
      }

      return payload;
    } catch (err: any) {
      kek.fill(0);
      throw new AppError(
        'SECURITY_VAULT_ERROR',
        'Failed to decrypt backup. Incorrect backup passphrase or corrupted ciphertext.'
      );
    }
  }
}
