import { NativeBridge, CredentialVault, VaultGate } from '@quickswap/security';
import {
  AccountSecretsRepository,
  AccountsRepository,
  SettingsRepository,
  ActivityLogRepository,
} from '@quickswap/database';
import { SecurityStatus, StoredCredentialMetadata, VaultLockStatus } from '@quickswap/shared';
import { ActivityService } from '../activity/service';

// Initialize VaultGate with SettingsRepository storage
VaultGate.setStorageProvider({
  get: (key: string) => SettingsRepository.getRaw(key),
  set: (key: string, value: string) => SettingsRepository.setRaw(key, value),
  remove: (key: string) => SettingsRepository.removeRaw(key),
});

export class CoreSecurityService {
  public static async getStatus(): Promise<SecurityStatus> {
    let winCred = false;
    let dpapi = false;

    try {
      const res = await NativeBridge.execute('status');
      winCred = Boolean(res.windowsCredManager);
      dpapi = Boolean(res.dpapi);
    } catch {
      winCred = false;
      dpapi = false;
    }

    const activeSecretReferences = AccountSecretsRepository.count();
    const totalAccountsWithSecrets = AccountSecretsRepository.countAccountsWithSecrets();

    let securityHealth: 'healthy' | 'degraded' | 'error' = 'healthy';
    if (!winCred || !dpapi) {
      securityHealth = 'error';
    } else if (activeSecretReferences === 0) {
      securityHealth = 'healthy';
    }

    return {
      windowsCredManagerAvailable: winCred,
      dpapiAvailable: dpapi,
      activeSecretReferences,
      totalAccountsWithSecrets,
      securityHealth,
      lastSecurityCheck: new Date().toISOString(),
    };
  }

  public static async listStoredCredentials(): Promise<StoredCredentialMetadata[]> {
    const rawList = await CredentialVault.listAccountHubCredentials();
    const result: StoredCredentialMetadata[] = [];

    for (const item of rawList) {
      // item.target is e.g. "AccountHub/acc-1234/password"
      const parts = item.target.split('/');
      const accountId = parts[1] || 'unknown';

      result.push({
        accountId,
        targetName: item.target,
        username: item.username,
        hasPassword: true,
        lastUpdated: new Date().toISOString(),
      });
    }

    return result;
  }

  public static async verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const accounts = AccountsRepository.list();

    for (const acc of accounts) {
      const secrets = AccountSecretsRepository.listByAccountId(acc.id);
      for (const s of secrets) {
        if (s.secretType === 'password') {
          const cred = await CredentialVault.getCredential(acc.id, 'password');
          if (!cred) {
            issues.push(
              `Account "${acc.displayName}" (${acc.id}) has a database secret reference, but the credential was not found in Windows Credential Manager.`
            );
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  public static async getLockStatus(): Promise<VaultLockStatus> {
    const settings = SettingsRepository.getSettings();
    VaultGate.setAutoLockMinutes(settings.autoLockMinutes || 0);
    VaultGate.checkAutoLock();
    return VaultGate.getStatus();
  }

  public static async setMasterPassword(password: string): Promise<{ success: boolean }> {
    const success = await VaultGate.setMasterPassword(password);
    return { success };
  }

  public static async unlockVault(password: string): Promise<{ success: boolean; message?: string }> {
    return VaultGate.unlock(password);
  }

  public static async lockVault(): Promise<{ success: boolean }> {
    VaultGate.lock();
    return { success: true };
  }

  public static async removeMasterPassword(currentPassword: string): Promise<{ success: boolean }> {
    const success = await VaultGate.removeMasterPassword(currentPassword);
    return { success };
  }

  public static async changeMasterPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    return VaultGate.changeMasterPassword(currentPassword, newPassword);
  }

  public static async resetVault(confirmation: string): Promise<{ success: boolean }> {
    // 1. Purge native credentials
    try {
      const creds = await CredentialVault.listQuickswapCredentials();
      for (const c of creds) {
        const parts = c.target.split('/');
        if (parts[1]) {
          await CredentialVault.deleteAllForAccount(parts[1]);
        }
      }
    } catch {}

    // 2. Clear database accounts, secrets & activity logs
    try {
      const accounts = AccountsRepository.list();
      for (const a of accounts) {
        AccountsRepository.delete(a.id);
      }
      ActivityLogRepository.clear();
    } catch {}

    // 3. Reset VaultGate master key envelope
    return VaultGate.resetVault(confirmation);
  }

  public static async verifyAuditLog() {
    return ActivityService.verifyLog();
  }

  public static async assertUnlocked(): Promise<void> {
    const settings = SettingsRepository.getSettings();
    VaultGate.setAutoLockMinutes(settings.autoLockMinutes || 0);
    VaultGate.checkAutoLock();
    await VaultGate.assertUnlocked();
  }

  public static recordActivity(): void {
    VaultGate.recordActivity();
  }
}
