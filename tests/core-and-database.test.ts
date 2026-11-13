import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection } from '../packages/database/src';
import {
  ApplicationService,
  AccountService,
  CoreSecurityService,
  ActivityService,
} from '../packages/core/src';
import { CredentialVault } from '../packages/security/src';
import fs from 'fs';
import path from 'path';

describe('Milestone 1 & 2: Database and Application/Account Services', () => {
  const testDbPath = path.resolve(__dirname, 'test-run.db');

  beforeEach(() => {
    DatabaseConnection.initialize(testDbPath);
  });

  afterEach(() => {
    DatabaseConnection.close();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // Ignore
      }
    }
  });

  it('registers and retrieves applications with validation', () => {
    // Register application with existing node executable as a valid path
    const nodeExe = process.execPath;
    const app = ApplicationService.register({
      name: 'Test Node App',
      adapterId: 'generic',
      executablePath: nodeExe,
      category: 'productivity',
      isFavorite: true,
    });

    expect(app.id).toBeDefined();
    expect(app.name).toBe('Test Node App');
    expect(app.isFavorite).toBe(true);

    const retrieved = ApplicationService.getById(app.id);
    expect(retrieved?.name).toBe('Test Node App');

    const list = ApplicationService.list();
    expect(list.some((a) => a.id === app.id)).toBe(true);
  });

  it('rejects registering an application with a non-existent executable', () => {
    expect(() => {
      ApplicationService.register({
        name: 'Fake Game',
        executablePath: 'C:\\NonExistentPath\\fake.exe',
      });
    }).toThrow(/not found at path/);
  });

  it('performs full Account CRUD with credentials stored in Windows Credential Manager', async () => {
    const nodeExe = process.execPath;
    const app = ApplicationService.register({
      name: 'Riot Games Mock',
      adapterId: 'riot',
      executablePath: nodeExe,
      category: 'games',
    });

    const testPassword = 'MySecretVaultPassword123!';
    const createdAccount = await AccountService.create({
      applicationId: app.id,
      displayName: 'Main Valorant Acc',
      username: 'gamer_valorant_1',
      password: testPassword,
      region: 'EUW',
      authMethod: 'credentials',
      isFavorite: true,
      isDefault: true,
    });

    expect(createdAccount.id).toBeDefined();
    expect(createdAccount.displayName).toBe('Main Valorant Acc');
    expect(createdAccount.hasCredentials).toBe(true);
    expect((createdAccount as any).password).toBeUndefined(); // NEVER returned to caller

    // Verify secret is physically in Windows Credential Manager
    const credInVault = await CredentialVault.getCredential(createdAccount.id, 'password');
    expect(credInVault?.password).toBe(testPassword);
    expect(credInVault?.username).toBe('gamer_valorant_1');

    // Update account
    const updated = await AccountService.update(createdAccount.id, {
      displayName: 'Renamed Valorant Acc',
      region: 'NA',
    });
    expect(updated.displayName).toBe('Renamed Valorant Acc');
    expect(updated.region).toBe('NA');

    // Toggle favorite and default
    const isFav = AccountService.toggleFavorite(createdAccount.id);
    expect(isFav).toBe(false);

    // List and filter
    const accounts = AccountService.list({ applicationId: app.id });
    expect(accounts.length).toBe(1);
    expect(accounts[0].displayName).toBe('Renamed Valorant Acc');

    // Delete account and verify secure wipe in Credential Manager
    await AccountService.delete(createdAccount.id);
    const postDeleteVault = await CredentialVault.getCredential(createdAccount.id, 'password');
    expect(postDeleteVault).toBeNull();

    const postDeleteAcc = AccountService.getById(createdAccount.id);
    expect(postDeleteAcc).toBeNull();
  });

  it('tracks default account per application properly', async () => {
    const nodeExe = process.execPath;
    const app = ApplicationService.register({
      name: 'Steam Mock',
      adapterId: 'steam',
      executablePath: nodeExe,
    });

    const acc1 = await AccountService.create({
      applicationId: app.id,
      displayName: 'Steam Account 1',
      isDefault: true,
    });

    const acc2 = await AccountService.create({
      applicationId: app.id,
      displayName: 'Steam Account 2',
      isDefault: true,
    });

    // Setting acc2 as default should clear acc1's default status
    const refreshed1 = AccountService.getById(acc1.id);
    const refreshed2 = AccountService.getById(acc2.id);

    expect(refreshed1?.isDefault).toBe(false);
    expect(refreshed2?.isDefault).toBe(true);
  });

  it('records activity logs without leaking secrets', async () => {
    ActivityService.log(
      'account_created',
      'account',
      'test-1',
      'Created Test Account',
      'Details with password: MySecretVaultPassword123!'
    );

    const logs = ActivityService.list();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);

    for (const log of logs) {
      expect(log.details || '').not.toContain('MySecretVaultPassword123!');
    }
  });

  it('reports accurate Security Status and performs integrity audits', async () => {
    const status = await CoreSecurityService.getStatus();
    expect(status.windowsCredManagerAvailable).toBe(true);
    expect(status.dpapiAvailable).toBe(true);
    expect(status.securityHealth).toBe('healthy');

    const integrity = await CoreSecurityService.verifyIntegrity();
    expect(integrity.valid).toBe(true);
    expect(integrity.issues.length).toBe(0);
  });
});
