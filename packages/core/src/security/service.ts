import { NativeBridge, CredentialVault } from '@quickswap/security';
import { AccountSecretsRepository, AccountsRepository } from '@quickswap/database';
import { SecurityStatus, StoredCredentialMetadata } from '@quickswap/shared';

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
}
