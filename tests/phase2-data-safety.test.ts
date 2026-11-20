import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  VaultGate,
  CredentialVault,
  MockNativeBridge,
  NativeBridge,
} from '../packages/security/src';
import {
  DatabaseConnection,
  ApplicationsRepository,
  AccountsRepository,
  SettingsRepository,
} from '../packages/database/src';
import {
  BackupService,
  BACKUP_MAGIC_HEADER,
  LegacyMigrationService,
} from '../packages/core/src';
import { AppError } from '../packages/shared/src';

describe('Phase 2 Data Safety & Release Engineering Tests', () => {
  const testDbDir = path.resolve(__dirname, 'test-sandbox');
  const primaryDbPath = path.join(testDbDir, 'quickswap-primary.db');
  const cleanDbPath = path.join(testDbDir, 'quickswap-clean.db');
  const backupFilePath = path.join(testDbDir, 'quickswap-test.qsbackup');
  const mockBridge = new MockNativeBridge();

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    mockBridge.clear();
    NativeBridge.setBridge(mockBridge);
    DatabaseConnection.initialize(primaryDbPath);
  });

  afterEach(() => {
    VaultGate.lock();
    DatabaseConnection.close();
    try {
      if (fs.existsSync(testDbDir)) {
        fs.rmSync(testDbDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('exports passphrase-protected backup with 600,000-iteration KEK, AES-256-GCM, and SHA-256 checksum', async () => {
    // 1. Seed database with application and account
    ApplicationsRepository.create({
      id: 'app-riot',
      name: 'Riot Games',
      adapterId: 'riot',
      executablePath: 'C:\\Riot Games\\RiotClientServices.exe',
      category: 'game',
      isFavorite: true,
    });

    AccountsRepository.create({
      id: 'acc-valorant-1',
      applicationId: 'app-riot',
      displayName: 'ViperMain#EUW',
      username: 'viper_euw',
      region: 'EUW',
      authMethod: 'credentials',
      isFavorite: true,
      isDefault: true,
    });

    await CredentialVault.saveCredential('acc-valorant-1', 'viper_euw', 'SuperSecretRiotPass123!');

    // 2. Export backup
    const passphrase = 'MyMasterBackupPassphrase2026!';
    const exportRes = await BackupService.exportBackup(passphrase, backupFilePath);

    expect(exportRes.success).toBe(true);
    expect(exportRes.accountsCount).toBe(1);
    expect(fs.existsSync(backupFilePath)).toBe(true);

    // 3. Inspect raw container structure
    const rawContent = fs.readFileSync(backupFilePath, 'utf8');
    const lines = rawContent.split('\n');

    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines[0].trim()).toBe(BACKUP_MAGIC_HEADER);

    const metadata = JSON.parse(lines[1]);
    expect(metadata.version).toBe(1);
    expect(metadata.kdf).toBe('pbkdf2-sha256');
    expect(metadata.iterations).toBe(600000);
    expect(metadata.salt).toBeDefined();
    expect(metadata.iv).toBeDefined();
    expect(metadata.tag).toBeDefined();
    expect(metadata.checksum).toBeDefined();

    // Verify SHA-256 checksum matches ciphertext
    const ciphertext = lines[2].trim();
    const expectedChecksum = crypto.createHash('sha256').update(ciphertext).digest('hex');
    expect(metadata.checksum).toBe(expectedChecksum);
  });

  it('inspects backup contents without modifying the active database', async () => {
    ApplicationsRepository.create({
      id: 'app-steam',
      name: 'Steam',
      adapterId: 'steam',
      executablePath: 'C:\\Steam\\steam.exe',
      category: 'game',
      isFavorite: false,
    });

    AccountsRepository.create({
      id: 'acc-steam-1',
      applicationId: 'app-steam',
      displayName: 'GamerProfile',
      username: 'gamer_pro',
      authMethod: 'credentials',
      isFavorite: false,
      isDefault: false,
    });

    const passphrase = 'InspectPassphrase123!';
    await BackupService.exportBackup(passphrase, backupFilePath);

    // Inspect without touching DB
    const preview = await BackupService.inspectBackup(passphrase, backupFilePath);

    expect(preview.valid).toBe(true);
    expect(preview.version).toBe(1);
    expect(preview.accountsCount).toBe(1);
    expect(preview.applicationsCount).toBe(1);
    expect(preview.accounts[0].displayName).toBe('GamerProfile');
    expect(preview.accounts[0].appName).toBe('Steam');
    expect(preview.applications[0].name).toBe('Steam');
  });

  it('restores backup successfully onto a completely clean database', async () => {
    // 1. Seed initial data
    ApplicationsRepository.create({
      id: 'app-riot',
      name: 'Riot Games',
      adapterId: 'riot',
      executablePath: 'C:\\Riot Games\\RiotClientServices.exe',
      category: 'game',
      isFavorite: true,
    });

    AccountsRepository.create({
      id: 'acc-restored-1',
      applicationId: 'app-riot',
      displayName: 'RestoredUser#NA',
      username: 'na_player_1',
      region: 'NA',
      authMethod: 'credentials',
      isFavorite: true,
      isDefault: true,
    });

    await CredentialVault.saveCredential('acc-restored-1', 'na_player_1', 'NaRestoredPass999!');

    const passphrase = 'CleanRestorePassphrase!';
    await BackupService.exportBackup(passphrase, backupFilePath);

    // 2. Switch to completely clean database
    DatabaseConnection.close();
    DatabaseConnection.initialize(cleanDbPath);

    // Verify clean database is empty
    expect(ApplicationsRepository.list()).toHaveLength(0);
    expect(AccountsRepository.list()).toHaveLength(0);

    // 3. Restore into clean database
    const restoreRes = await BackupService.restoreBackup(passphrase, backupFilePath);

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.applicationsRestored).toBe(1);
    expect(restoreRes.accountsRestored).toBe(1);

    // Verify restored records
    const apps = ApplicationsRepository.list();
    expect(apps).toHaveLength(1);
    expect(apps[0].id).toBe('app-riot');
    expect(apps[0].name).toBe('Riot Games');

    const accounts = AccountsRepository.list();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe('acc-restored-1');
    expect(accounts[0].displayName).toBe('RestoredUser#NA');

    // Verify restored credential
    const restoredCred = await CredentialVault.getCredential('acc-restored-1', 'password');
    expect(restoredCred).not.toBeNull();
    expect(restoredCred?.password).toBe('NaRestoredPass999!');
  });

  it('rejects tampered backup ciphertext via SHA-256 integrity check', async () => {
    ApplicationsRepository.create({
      id: 'app-test',
      name: 'Test App',
      adapterId: 'generic',
      executablePath: 'C:\\test.exe',
      category: 'other',
      isFavorite: false,
    });

    const passphrase = 'TamperTestPassphrase!';
    await BackupService.exportBackup(passphrase, backupFilePath);

    // Tamper with the ciphertext on disk
    const content = fs.readFileSync(backupFilePath, 'utf8');
    const lines = content.split('\n');
    // Modify one hex character in ciphertext
    const tamperedCiphertext = lines[2].startsWith('a') ? 'b' + lines[2].slice(1) : 'a' + lines[2].slice(1);
    const tamperedContent = `${lines[0]}\n${lines[1]}\n${tamperedCiphertext}`;
    fs.writeFileSync(backupFilePath, tamperedContent, 'utf8');

    // Integrity check must fail
    await expect(BackupService.inspectBackup(passphrase, backupFilePath)).rejects.toThrow(
      /integrity check failed/i
    );
  });

  it('rejects decryption when provided an incorrect passphrase', async () => {
    ApplicationsRepository.create({
      id: 'app-test',
      name: 'Test App',
      adapterId: 'generic',
      executablePath: 'C:\\test.exe',
      category: 'other',
      isFavorite: false,
    });

    const correctPassphrase = 'CorrectPassphrase123!';
    await BackupService.exportBackup(correctPassphrase, backupFilePath);

    // Decrypt with wrong passphrase
    await expect(BackupService.inspectBackup('WrongPassphrase999!', backupFilePath)).rejects.toThrow(
      /Incorrect backup passphrase/i
    );
  });

  it('supports conflict strategies (skip, overwrite, keep_both) on restore', async () => {
    ApplicationsRepository.create({
      id: 'app-shared',
      name: 'Shared App',
      adapterId: 'generic',
      executablePath: 'C:\\app.exe',
      category: 'other',
      isFavorite: false,
    });

    AccountsRepository.create({
      id: 'acc-conflict',
      applicationId: 'app-shared',
      displayName: 'Original Name',
      authMethod: 'credentials',
      isFavorite: false,
      isDefault: false,
    });

    const passphrase = 'ConflictPassphrase1!';
    await BackupService.exportBackup(passphrase, backupFilePath);

    // Modify local record
    AccountsRepository.update('acc-conflict', { displayName: 'Locally Updated Name' });

    // Test 'skip' strategy
    await BackupService.restoreBackup(passphrase, backupFilePath, 'skip');
    expect(AccountsRepository.getById('acc-conflict')?.displayName).toBe('Locally Updated Name');

    // Test 'overwrite' strategy
    await BackupService.restoreBackup(passphrase, backupFilePath, 'overwrite');
    expect(AccountsRepository.getById('acc-conflict')?.displayName).toBe('Original Name');

    // Test 'keep_both' strategy
    await BackupService.restoreBackup(passphrase, backupFilePath, 'keep_both');
    const allAccs = AccountsRepository.list();
    expect(allAccs.length).toBe(2);
  });

  it('migrates legacy AccountHub credentials safely, retains originals, and supports explicit cleanup', async () => {
    // 1. Simulate legacy AccountHub credential target in Windows Credential Manager
    // Format: AccountHub/<accountId>/password
    const legacyTarget = 'AccountHub/acc-legacy-42/password';
    await mockBridge.execute('cred-write', [legacyTarget, 'legacy_gamer'], 'LegacyPasswordSecret!');

    // Verify initial credential status
    const initialList = await CredentialVault.listAccountHubCredentials();
    expect(initialList.some((c) => c.target === legacyTarget)).toBe(true);

    // 2. Run legacy migration
    const migrationResult = await LegacyMigrationService.migrate();
    expect(migrationResult.migratedCredentials).toBeGreaterThanOrEqual(1);

    // 3. Verify copied Quickswap credential exists
    const quickswapTarget = CredentialVault.formatTarget('acc-legacy-42', 'password');
    const newCred = await mockBridge.execute('cred-read', [quickswapTarget]);
    expect(newCred.found).toBe(true);
    expect(newCred.password).toBe('LegacyPasswordSecret!');

    // 4. Verify original legacy credential is STILL intact (zero-data-loss guarantee)
    const oldCred = await mockBridge.execute('cred-read', [legacyTarget]);
    expect(oldCred.found).toBe(true);
    expect(oldCred.password).toBe('LegacyPasswordSecret!');

    // 5. Run explicit cleanup step
    const cleanupResult = await LegacyMigrationService.cleanupLegacyData();
    expect(cleanupResult.cleanedCredentials).toBeGreaterThanOrEqual(1);

    // 6. Verify legacy credential purged but modern Quickswap credential remains
    const purgedLegacyCred = await mockBridge.execute('cred-read', [legacyTarget]);
    expect(purgedLegacyCred.found).toBe(false);

    const retainedQuickswapCred = await mockBridge.execute('cred-read', [quickswapTarget]);
    expect(retainedQuickswapCred.found).toBe(true);
    expect(retainedQuickswapCred.password).toBe('LegacyPasswordSecret!');
  });
});
