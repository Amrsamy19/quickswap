import { NativeBridge } from '../native/native-bridge';
import { AppError } from '@quickswap/shared';

export interface CredentialEntry {
  target: string;
  username: string;
  password?: string;
}

export class CredentialVault {
  private static readonly TARGET_PREFIX = 'Quickswap';
  private static readonly LEGACY_TARGET_PREFIX = 'AccountHub';

  public static formatTarget(accountId: string, secretType: string = 'password'): string {
    return `${this.TARGET_PREFIX}/${accountId}/${secretType}`;
  }

  public static async saveCredential(
    accountId: string,
    username: string,
    password: string,
    secretType: string = 'password'
  ): Promise<string> {
    if (!accountId) {
      throw new AppError('INVALID_INPUT', 'accountId is required to save credential');
    }
    const target = this.formatTarget(accountId, secretType);
    await NativeBridge.execute('cred-write', [target, username || ''], password);
    return target;
  }

  public static async getCredential(
    accountId: string,
    secretType: string = 'password'
  ): Promise<{ username: string; password: string } | null> {
    const target = this.formatTarget(accountId, secretType);
    let res = await NativeBridge.execute('cred-read', [target]);
    if (!res.found) {
      // Backward compatibility: check legacy AccountHub target
      const legacyTarget = `${this.LEGACY_TARGET_PREFIX}/${accountId}/${secretType}`;
      res = await NativeBridge.execute('cred-read', [legacyTarget]);
    }

    if (!res.found) {
      return null;
    }
    return {
      username: res.username,
      password: res.password,
    };
  }

  public static async deleteCredential(
    accountId: string,
    secretType: string = 'password'
  ): Promise<void> {
    const target = this.formatTarget(accountId, secretType);
    const legacyTarget = `${this.LEGACY_TARGET_PREFIX}/${accountId}/${secretType}`;
    await Promise.allSettled([
      NativeBridge.execute('cred-delete', [target]),
      NativeBridge.execute('cred-delete', [legacyTarget]),
    ]);
  }

  public static async deleteAllForAccount(accountId: string): Promise<void> {
    const types = ['password', 'session_token', 'refresh_token'];
    for (const t of types) {
      try {
        await this.deleteCredential(accountId, t);
      } catch {
        // Ignore deletion of non-existing secrets
      }
    }
  }

  public static async listQuickswapCredentials(): Promise<Array<{ target: string; username: string }>> {
    const [quickswapRes, legacyRes] = await Promise.all([
      NativeBridge.execute('cred-list', [this.TARGET_PREFIX]).catch(() => ({ credentials: [] })),
      NativeBridge.execute('cred-list', [this.LEGACY_TARGET_PREFIX]).catch(() => ({ credentials: [] })),
    ]);

    const combined = [...(quickswapRes.credentials || []), ...(legacyRes.credentials || [])];
    const unique = new Map<string, { target: string; username: string }>();
    for (const cred of combined) {
      unique.set(cred.target, cred);
    }
    return Array.from(unique.values());
  }

  public static async listAccountHubCredentials(): Promise<Array<{ target: string; username: string }>> {
    return this.listQuickswapCredentials();
  }
}
