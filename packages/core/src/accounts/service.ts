import crypto from 'crypto';
import {
  AccountsRepository,
  AccountSecretsRepository,
  ApplicationsRepository,
} from '@quickswap/database';
import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilter,
  AppError,
  CreateAccountSchema,
  UpdateAccountSchema,
  AccountFilterSchema,
} from '@quickswap/shared';
import { CredentialVault, VaultGate, encryptString, decryptString, isEncryptedString } from '@quickswap/security';
import { ActivityService } from '../activity/service';
import { CoreSecurityService } from '../security/service';

export class AccountService {
  private static decryptMetadata(account: Account): Account {
    let username = account.username;
    let launchArgs = account.launchArguments;

    let isUnlocked = false;
    let dek: Buffer | null = null;
    try {
      dek = VaultGate.getDEK();
      isUnlocked = true;
    } catch {
      isUnlocked = false;
    }

    if (username && isEncryptedString(username)) {
      username = isUnlocked && dek ? decryptString(username, dek) : '••••••••';
    }
    if (launchArgs && isEncryptedString(launchArgs)) {
      launchArgs = isUnlocked && dek ? decryptString(launchArgs, dek) : null;
    }

    return {
      ...account,
      username,
      launchArguments: launchArgs,
    };
  }

  public static list(filter?: AccountFilter): Account[] {
    if (filter) {
      AccountFilterSchema.parse(filter);
    }
    const accounts = AccountsRepository.list(filter);
    return accounts.map(this.decryptMetadata);
  }

  public static getById(id: string): Account | null {
    const account = AccountsRepository.getById(id);
    return account ? this.decryptMetadata(account) : null;
  }

  public static async create(input: CreateAccountInput): Promise<Account> {
    const validated = CreateAccountSchema.parse(input);

    const app = ApplicationsRepository.getById(validated.applicationId);
    if (!app) {
      throw new AppError(
        'APP_NOT_FOUND',
        `Cannot create account: Application ${validated.applicationId} does not exist.`
      );
    }

    const accountId = `acc-${crypto.randomUUID()}`;

    let usernameToStore = validated.username;
    let launchArgsToStore = validated.launchArguments;

    try {
      const dek = VaultGate.getDEK();
      if (usernameToStore) {
        usernameToStore = encryptString(usernameToStore, dek);
      }
      if (launchArgsToStore) {
        launchArgsToStore = encryptString(launchArgsToStore, dek);
      }
    } catch {
      // Vault is locked or no master password set
    }

    // 1. Persist account metadata (WITHOUT password)
    AccountsRepository.create({
      id: accountId,
      applicationId: validated.applicationId,
      displayName: validated.displayName,
      username: usernameToStore,
      region: validated.region,
      avatar: validated.avatar,
      authMethod: validated.authMethod,
      isFavorite: validated.isFavorite,
      isDefault: validated.isDefault,
      launchArguments: launchArgsToStore,
    });

    // 2. Securely store password in Windows Credential Manager if provided
    if (validated.password && validated.password.trim()) {
      try {
        const target = await CredentialVault.saveCredential(
          accountId,
          validated.username || validated.displayName,
          validated.password,
          'password'
        );

        // Save secret reference in database (storing reference target only, NEVER the secret)
        AccountSecretsRepository.saveReference({
          id: `sec-${crypto.randomUUID()}`,
          accountId,
          secretType: 'password',
          credentialRef: target,
        });

        ActivityService.log(
          'credentials_saved',
          'security',
          accountId,
          `Saved credentials in Windows Credential Manager for "${validated.displayName}"`
        );
      } catch (err) {
        // Rollback account creation if secret storage fails
        AccountsRepository.delete(accountId);
        throw err;
      }
    }

    ActivityService.log(
      'account_created',
      'account',
      accountId,
      `Added account "${validated.displayName}" for ${app.name}`
    );

    const created = AccountsRepository.getById(accountId);
    if (!created) {
      throw new AppError('DATABASE_ERROR', 'Failed to retrieve created account');
    }
    return created;
  }

  public static async update(id: string, input: UpdateAccountInput): Promise<Account> {
    const validated = UpdateAccountSchema.parse(input);
    const existing = AccountsRepository.getById(id);
    if (!existing) {
      throw new AppError('ACCOUNT_NOT_FOUND', `Account with ID ${id} was not found`);
    }

    // Update password in Windows Credential Manager if provided
    if (validated.password !== undefined && validated.password !== null) {
      if (validated.password.trim() === '') {
        // Clear credential if empty string passed
        await CredentialVault.deleteCredential(id, 'password');
        AccountSecretsRepository.deleteByAccountAndType(id, 'password');
        ActivityService.log(
          'credentials_cleared',
          'security',
          id,
          `Cleared credentials for "${existing.displayName}"`
        );
      } else {
        const username = validated.username ?? existing.username ?? existing.displayName;
        const target = await CredentialVault.saveCredential(
          id,
          username,
          validated.password,
          'password'
        );

        AccountSecretsRepository.saveReference({
          id: `sec-${crypto.randomUUID()}`,
          accountId: id,
          secretType: 'password',
          credentialRef: target,
        });

        ActivityService.log(
          'credentials_saved',
          'security',
          id,
          `Updated credentials in Windows Credential Manager for "${existing.displayName}"`
        );
      }
    }

    const updatePayload = { ...validated };
    try {
      const dek = VaultGate.getDEK();
      if (updatePayload.username) {
        updatePayload.username = encryptString(updatePayload.username, dek);
      }
      if (updatePayload.launchArguments) {
        updatePayload.launchArguments = encryptString(updatePayload.launchArguments, dek);
      }
    } catch {
      // Vault is locked or no master password
    }

    AccountsRepository.update(id, updatePayload);
    ActivityService.log(
      'account_updated',
      'account',
      id,
      `Updated account "${validated.displayName || existing.displayName}"`
    );

    return this.getById(id)!;
  }

  public static async delete(id: string): Promise<void> {
    const existing = AccountsRepository.getById(id);
    if (!existing) {
      throw new AppError('ACCOUNT_NOT_FOUND', `Account with ID ${id} was not found`);
    }

    // 1. Purge all secrets from Windows Credential Manager and DPAPI
    try {
      await CredentialVault.deleteAllForAccount(id);
    } catch {
      // Continue even if native delete encounters warning
    }

    // 2. Delete secret references
    AccountSecretsRepository.deleteByAccountId(id);

    // 3. Delete account metadata (cascades launch history)
    AccountsRepository.delete(id);

    ActivityService.log(
      'account_deleted',
      'account',
      id,
      `Deleted account "${existing.displayName}" and wiped stored secrets`
    );
  }

  public static setDefault(id: string): void {
    const existing = AccountsRepository.getById(id);
    if (!existing) {
      throw new AppError('ACCOUNT_NOT_FOUND', `Account with ID ${id} was not found`);
    }
    AccountsRepository.setDefault(id);
    ActivityService.log(
      'account_updated',
      'account',
      id,
      `Set "${existing.displayName}" as default account`
    );
  }

  public static toggleFavorite(id: string): boolean {
    const existing = AccountsRepository.getById(id);
    if (!existing) {
      throw new AppError('ACCOUNT_NOT_FOUND', `Account with ID ${id} was not found`);
    }
    const nextVal = AccountsRepository.toggleFavorite(id);
    ActivityService.log(
      'account_updated',
      'account',
      id,
      `${nextVal ? 'Favorited' : 'Unfavorited'} account "${existing.displayName}"`
    );
    return nextVal;
  }

  public static async getPassword(accountId: string): Promise<{ username: string; password: string } | null> {
    const existing = AccountsRepository.getById(accountId);
    if (!existing) {
      throw new AppError('ACCOUNT_NOT_FOUND', `Account with ID ${accountId} was not found`);
    }
    await CoreSecurityService.assertUnlocked();
    return CredentialVault.getCredential(accountId, 'password');
  }
}
