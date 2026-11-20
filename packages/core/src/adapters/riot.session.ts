import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DpapiVault } from '@quickswap/security';
import {
  AccountSecretsRepository,
  AccountsRepository,
  SettingsRepository,
} from '@quickswap/database';
import { AppError } from '@quickswap/shared';
import { ActivityService } from '../activity/service';

export interface RiotSessionPayload {
  version: number;
  accountId: string;
  capturedAt: string;
  yaml: string;
}

export class RiotSessionManager {
  private static customDataDir: string | null = null;

  /**
   * For testing or custom setups, override the Riot Client Data directory.
   */
  public static setCustomDataDir(dir: string | null): void {
    this.customDataDir = dir;
  }

  public static getDataDir(): string {
    if (this.customDataDir) {
      return this.customDataDir;
    }
    const localAppData = process.env.LOCALAPPDATA || '';
    return path.join(localAppData, 'Riot Games', 'Riot Client', 'Data');
  }

  public static getPrivateSettingsPath(): string {
    return path.join(this.getDataDir(), 'RiotGamesPrivateSettings.yaml');
  }

  /**
   * Verifies if Riot Client currently has an active, authenticated "Stay signed in" session.
   */
  public static isSessionActive(): { active: boolean; reason?: string } {
    const filePath = this.getPrivateSettingsPath();
    if (!fs.existsSync(filePath)) {
      return {
        active: false,
        reason: 'RiotGamesPrivateSettings.yaml was not found on this system.',
      };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check if riot-login has active persist tokens or rso-authenticator has tokens
      const hasNullPersist = /riot-login:\s*\r?\n\s+persist:\s*null/i.test(content);
      const hasPersistData =
        /riot-login:\s*\r?\n\s+persist:\s*(?!null)\S+/i.test(content) ||
        (/persist:\s*\r?\n\s+\w+/i.test(content) && !hasNullPersist);
      const hasNonNullClientAuth = /riot-client:\s*(?!"?null"?)\S+/i.test(content);
      const hasTokens =
        content.includes('access_token') ||
        content.includes('refresh_token') ||
        content.includes('id_token') ||
        hasNonNullClientAuth;

      if (hasNullPersist && !hasTokens) {
        return {
          active: false,
          reason: 'Riot Client is currently logged out (no active session cookies found).',
        };
      }

      if (hasPersistData || hasTokens) {
        return { active: true };
      }

      return {
        active: false,
        reason: 'No authenticated credentials or active session found in Riot settings.',
      };
    } catch (err: any) {
      return {
        active: false,
        reason: `Failed to read Riot settings: ${err.message}`,
      };
    }
  }

  /**
   * Checks whether AccountHub already has an encrypted session snapshot stored for this account.
   */
  public static hasSavedSession(accountId: string): boolean {
    const ref = AccountSecretsRepository.getByAccountAndType(accountId, 'session_token');
    return ref !== null && Boolean(ref.credentialRef);
  }

  /**
   * Captures the active Riot Client session from disk, encrypts it via DPAPI,
   * and associates it with the given account.
   */
  public static async captureActiveSession(
    accountId: string
  ): Promise<{ success: boolean; message: string }> {
    const account = AccountsRepository.getById(accountId);
    if (!account) {
      throw new AppError('ACCOUNT_NOT_FOUND', `Account ${accountId} was not found.`);
    }

    const check = this.isSessionActive();
    if (!check.active) {
      return {
        success: false,
        message:
          check.reason ||
          'No active Riot session found. Please open Riot Client, log into your account with "Stay signed in" enabled, and try again.',
      };
    }

    const filePath = this.getPrivateSettingsPath();
    const content = fs.readFileSync(filePath, 'utf8');

    const payload: RiotSessionPayload = {
      version: 1,
      accountId,
      capturedAt: new Date().toISOString(),
      yaml: content,
    };

    // Encrypt snapshot with DPAPI (CurrentUser)
    const encrypted = await DpapiVault.protect(JSON.stringify(payload));

    // Save in database
    AccountSecretsRepository.saveReference({
      id: `sec-${crypto.randomUUID()}`,
      accountId,
      secretType: 'session_token',
      credentialRef: encrypted,
    });

    ActivityService.log(
      'session_captured',
      'account',
      accountId,
      `Linked active Riot Client session for "${account.displayName}"`
    );

    return {
      success: true,
      message: `Active Riot session for "${account.displayName}" successfully captured and encrypted with Windows DPAPI!`,
    };
  }

  /**
   * Decrypts the account's session snapshot and restores it to Riot Client's Data folder.
   */
  public static async restoreSession(
    accountId: string
  ): Promise<{ success: boolean; message: string }> {
    const ref = AccountSecretsRepository.getByAccountAndType(accountId, 'session_token');
    if (!ref || !ref.credentialRef) {
      return {
        success: false,
        message: 'No saved session exists for this account.',
      };
    }

    const account = AccountsRepository.getById(accountId);
    const decryptedJson = await DpapiVault.unprotect(ref.credentialRef);
    let payload: RiotSessionPayload;

    try {
      payload = JSON.parse(decryptedJson);
    } catch {
      throw new AppError('INVALID_SESSION_DATA', 'Saved session payload could not be parsed.');
    }

    const dataDir = this.getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const targetPath = this.getPrivateSettingsPath();
    const backupEncPath = `${targetPath}.bak.enc`;
    const legacyBak = `${targetPath}.bak`;

    // 1. Encrypt backup at rest instead of plaintext .bak
    if (fs.existsSync(targetPath)) {
      try {
        const existingContent = fs.readFileSync(targetPath, 'utf8');
        const encryptedBackup = await DpapiVault.protect(existingContent);
        fs.writeFileSync(backupEncPath, encryptedBackup, 'utf8');
      } catch (err: any) {
        console.warn(`[RiotSessionManager] Encrypted backup warning: ${err.message}`);
      }
    }

    // Scrub any legacy plaintext .bak file
    if (fs.existsSync(legacyBak)) {
      try {
        fs.unlinkSync(legacyBak);
      } catch {}
    }

    // 2. Write the decrypted session YAML
    fs.writeFileSync(targetPath, payload.yaml, 'utf8');

    // 3. Persist crash recovery marker
    try {
      SettingsRepository.setRaw(
        'riot_active_launch_state',
        JSON.stringify({
          accountId,
          targetPath,
          backupEncPath,
          launchedAt: new Date().toISOString(),
        })
      );
    } catch {}

    ActivityService.log(
      'session_restored',
      'account',
      accountId,
      `Restored Riot session for "${account?.displayName || accountId}"`
    );

    return {
      success: true,
      message: `Restored session for "${account?.displayName || 'account'}".`,
    };
  }

  /**
   * Clears any saved session for an account.
   */
  public static async clearSession(accountId: string): Promise<void> {
    AccountSecretsRepository.deleteByAccountAndType(accountId, 'session_token');
    ActivityService.log(
      'session_cleared',
      'account',
      accountId,
      `Unlinked Riot session for account ${accountId}`
    );
  }

  /**
   * Startup crash and force-kill recovery:
   * Checks if an unfinalized session state or dangling plaintext backup remains from a prior crash.
   * Restores original encrypted session and securely scrubs plaintext files.
   */
  public static async recoverFromCrash(): Promise<{ recovered: boolean; message?: string }> {
    const targetPath = this.getPrivateSettingsPath();
    const legacyBak = `${targetPath}.bak`;
    const backupEncPath = `${targetPath}.bak.enc`;

    // Always scrub any lingering plaintext .bak file
    if (fs.existsSync(legacyBak)) {
      try {
        fs.unlinkSync(legacyBak);
      } catch {}
    }

    const rawState = SettingsRepository.getRaw('riot_active_launch_state');
    if (!rawState && !fs.existsSync(backupEncPath)) {
      return { recovered: false };
    }

    try {
      if (fs.existsSync(backupEncPath)) {
        const encrypted = fs.readFileSync(backupEncPath, 'utf8');
        const restoredPlain = await DpapiVault.unprotect(encrypted);
        fs.writeFileSync(targetPath, restoredPlain, 'utf8');
        fs.unlinkSync(backupEncPath);
      }

      SettingsRepository.removeRaw('riot_active_launch_state');
      ActivityService.log(
        'session_restored',
        'security',
        null,
        'Recovered Riot session state after previous crash/force-kill'
      );

      return {
        recovered: true,
        message: 'Successfully recovered Riot session state from prior ungraceful shutdown.',
      };
    } catch (err: any) {
      SettingsRepository.removeRaw('riot_active_launch_state');
      return {
        recovered: false,
        message: `Crash recovery finished with note: ${err.message}`,
      };
    }
  }

  /**
   * Cleans up plaintext session files or restores original encrypted backup after process launch/exit.
   */
  public static async cleanupSessionAfterLaunch(accountId?: string): Promise<void> {
    const targetPath = this.getPrivateSettingsPath();
    const backupEncPath = `${targetPath}.bak.enc`;
    const legacyBak = `${targetPath}.bak`;

    if (fs.existsSync(legacyBak)) {
      try { fs.unlinkSync(legacyBak); } catch {}
    }

    if (fs.existsSync(backupEncPath)) {
      try {
        const encrypted = fs.readFileSync(backupEncPath, 'utf8');
        const restored = await DpapiVault.unprotect(encrypted);
        fs.writeFileSync(targetPath, restored, 'utf8');
        fs.unlinkSync(backupEncPath);
      } catch {}
    }

    SettingsRepository.removeRaw('riot_active_launch_state');
  }
}
