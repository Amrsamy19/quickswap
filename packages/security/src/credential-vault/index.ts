import { NativeBridge } from '../native/native-bridge';
import { AppError } from '@accounthub/shared';

export interface CredentialEntry {
  target: string;
  username: string;
  password?: string;
}

export class CredentialVault {
  private static readonly TARGET_PREFIX = 'AccountHub';

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
    const res = await NativeBridge.execute('cred-read', [target]);
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
    await NativeBridge.execute('cred-delete', [target]);
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

  public static async listAccountHubCredentials(): Promise<Array<{ target: string; username: string }>> {
    const res = await NativeBridge.execute('cred-list', [this.TARGET_PREFIX]);
    return res.credentials || [];
  }
}
