import crypto from 'crypto';
import {
  AccountsRepository,
  AccountSecretsRepository,
  ApplicationsRepository,
} from '@accounthub/database';
import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilter,
  AppError,
  CreateAccountSchema,
  UpdateAccountSchema,
  AccountFilterSchema,
} from '@accounthub/shared';
import { CredentialVault } from '@accounthub/security';
import { ActivityService } from '../activity/service';

export class AccountService {
  public static list(filter?: AccountFilter): Account[] {
    if (filter) {
      AccountFilterSchema.parse(filter);
    }
    return AccountsRepository.list(filter);
  }

  public static getById(id: string): Account | null {
    return AccountsRepository.getById(id);
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

    // 1. Persist account metadata (WITHOUT password)
    AccountsRepository.create({
      id: accountId,
      applicationId: validated.applicationId,
      displayName: validated.displayName,
      username: validated.username,
      region: validated.region,
      avatar: validated.avatar,
      authMethod: validated.authMethod,
      isFavorite: validated.isFavorite,
      isDefault: validated.isDefault,
      launchArguments: validated.launchArguments,
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

    AccountsRepository.update(id, validated);
    ActivityService.log(
      'account_updated',
      'account',
      id,
      `Updated account "${validated.displayName || existing.displayName}"`
    );

    return AccountsRepository.getById(id)!;
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
}
