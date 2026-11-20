import { describe, it, expect, afterAll } from 'vitest';
import {
  RegisterApplicationSchema,
  CreateAccountSchema,
  AppError,
} from '../packages/shared/src';
import {
  NativeBridge,
  CredentialVault,
  DpapiVault,
  SecuritySanitizer,
} from '../packages/security/src';

describe('AccountHub Shared Package', () => {
  it('validates application registration schema correctly', () => {
    const valid = RegisterApplicationSchema.parse({
      name: 'Riot Games',
      adapterId: 'riot',
      executablePath: 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
      category: 'games',
      isFavorite: true,
    });
    expect(valid.name).toBe('Riot Games');
    expect(valid.category).toBe('games');

    expect(() => {
      RegisterApplicationSchema.parse({
        name: '',
        executablePath: '',
      });
    }).toThrow();
  });

  it('validates account creation and strips/validates fields', () => {
    const account = CreateAccountSchema.parse({
      applicationId: 'app-123',
      displayName: 'Main Smurf',
      username: 'gamer@riot.com',
      password: 'SamplePassword123!',
      region: 'EUW',
      authMethod: 'hybrid',
      isFavorite: true,
      isDefault: true,
    });
    expect(account.displayName).toBe('Main Smurf');
    expect(account.authMethod).toBe('hybrid');
    expect(account.password).toBe('SamplePassword123!');
  });

  it('rejects invalid inputs with descriptive validation errors', () => {
    expect(() => {
      CreateAccountSchema.parse({
        applicationId: '',
        displayName: '',
      });
    }).toThrow();
  });

  it('serializes AppError properly', () => {
    const err = new AppError('ACCOUNT_NOT_FOUND', 'The requested account was not found', { id: 'test-1' });
    const json = err.toJSON();
    expect(json.code).toBe('ACCOUNT_NOT_FOUND');
    expect(json.message).toContain('not found');
  });
});

describe('AccountHub Security Package (Windows Native Credential Manager & DPAPI)', () => {
  const testAccountId = `test-acc-${Date.now()}`;
  const testUsername = 'tester@accounthub.local';
  const testPassword = 'P@ssw0rd-Super-Secret-2026!';

  afterAll(async () => {
    // Clean up test credentials
    try {
      await CredentialVault.deleteAllForAccount(testAccountId);
    } catch {
      // Ignore
    }
  });

  it('connects to native bridge and checks Windows security API status', async () => {
    const status = await NativeBridge.execute('status');
    expect(status.windowsCredManager).toBe(true);
    expect(status.dpapi).toBe(true);
  });

  it('encrypts and decrypts strings using Windows DPAPI (CurrentUser)', async () => {
    const sensitiveToken = 'riot_oauth_session_token_xyz_987654321';
    const cipherText = await DpapiVault.protect(sensitiveToken);

    expect(cipherText).not.toBe(sensitiveToken);
    expect(typeof cipherText).toBe('string');
    expect(cipherText.length).toBeGreaterThan(20);

    const decrypted = await DpapiVault.unprotect(cipherText);
    expect(decrypted).toBe(sensitiveToken);
  });

  it('saves, reads, and deletes credentials in Windows Credential Manager', async () => {
    // 1. Save credential
    const target = await CredentialVault.saveCredential(
      testAccountId,
      testUsername,
      testPassword,
      'password'
    );
    expect(target).toContain(testAccountId);

    // 2. Read back credential
    const read = await CredentialVault.getCredential(testAccountId, 'password');
    expect(read).not.toBeNull();
    expect(read?.username).toBe(testUsername);
    expect(read?.password).toBe(testPassword);

    // 3. List credentials and verify target appears
    const list = await CredentialVault.listQuickswapCredentials();
    const found = list.find((item) => item.target === target);
    expect(found).toBeDefined();

    // 4. Delete credential
    await CredentialVault.deleteCredential(testAccountId, 'password');

    // 5. Verify deletion
    const readAfterDelete = await CredentialVault.getCredential(testAccountId, 'password');
    expect(readAfterDelete).toBeNull();
  });

  it('sanitizes sensitive data objects and prevents credential leaks in logs', () => {
    const rawPayload = {
      accountId: 'acc-1',
      username: 'gamer',
      password: 'PlaintextPassword!',
      session_token: 'secret_token_123',
      meta: {
        auth_header: 'Bearer 12345',
        region: 'EUW',
      },
    };

    const sanitized: any = SecuritySanitizer.sanitize(rawPayload);
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.session_token).toBe('[REDACTED]');
    expect(sanitized.meta.auth_header).toBe('[REDACTED]');
    expect(sanitized.meta.region).toBe('EUW');
    expect(sanitized.username).toBe('gamer');

    expect(() => {
      SecuritySanitizer.assertSafeMetadata({
        password: 'unredacted_password',
      });
    }).toThrow(/Security breach/);
  });

  it('verifies MockNativeBridge enables isolated in-memory execution', async () => {
    const { MockNativeBridge } = await import('../packages/security/src/native/native-bridge');
    const mock = new MockNativeBridge();

    // 1. Status
    const status = await mock.execute('status');
    expect(status.windowsCredManager).toBe(true);
    expect(status.dpapi).toBe(true);

    // 2. DPAPI Protect and Unprotect
    const enc = await mock.execute('dpapi-protect', [], 'SecretSessionToken456');
    expect(enc.success).toBe(true);
    const dec = await mock.execute('dpapi-unprotect', [], enc.data);
    expect(dec.success).toBe(true);
    expect(dec.data).toBe('SecretSessionToken456');

    // 3. Credential CRUD
    await mock.execute('cred-write', ['Quickswap/test/pwd', 'user1'], 'SecretPass!');
    const read = await mock.execute('cred-read', ['Quickswap/test/pwd']);
    expect(read.found).toBe(true);
    expect(read.username).toBe('user1');
    expect(read.password).toBe('SecretPass!');

    await mock.execute('cred-delete', ['Quickswap/test/pwd']);
    const read2 = await mock.execute('cred-read', ['Quickswap/test/pwd']);
    expect(read2.found).toBe(false);
  });

  it('protects vault with VaultGate master password derivation and brute-force backoff', async () => {
    const { VaultGate } = await import('../packages/security/src/vault-gate');
    const store = new Map<string, string>();
    VaultGate.setStorageProvider({
      get: (k) => store.get(k) || null,
      set: (k, v) => { store.set(k, v); },
      remove: (k) => { store.delete(k); },
    });

    // 1. Initially no master password
    expect(await VaultGate.hasMasterPassword()).toBe(false);
    await expect(VaultGate.assertUnlocked()).resolves.toBeUndefined();

    // 2. Set master password
    await VaultGate.setMasterPassword('MasterKey2026!');
    expect(await VaultGate.hasMasterPassword()).toBe(true);
    const statusAfterSet = await VaultGate.getStatus();
    expect(statusAfterSet.isLocked).toBe(false);

    // 3. Lock vault
    VaultGate.lock();
    const statusLocked = await VaultGate.getStatus();
    expect(statusLocked.isLocked).toBe(true);

    // 4. Assert unlocked fails when locked
    await expect(VaultGate.assertUnlocked()).rejects.toThrow(/Vault is locked/);

    // 5. Unlock with wrong password fails
    await expect(VaultGate.unlock('WrongPassword!')).rejects.toThrow(/Incorrect master password/);
    const statusFailed = await VaultGate.getStatus();
    expect(statusFailed.failedAttempts).toBe(1);

    // 6. Unlock with correct password succeeds
    const unlockRes = await VaultGate.unlock('MasterKey2026!');
    expect(unlockRes.success).toBe(true);
    const statusUnlocked = await VaultGate.getStatus();
    expect(statusUnlocked.isLocked).toBe(false);
    expect(statusUnlocked.failedAttempts).toBe(0);

    // 7. Remove master password
    await VaultGate.removeMasterPassword('MasterKey2026!');
    expect(await VaultGate.hasMasterPassword()).toBe(false);
  });

  it('executes consecutive requests through the persistent helper daemon', async () => {
    const start = Date.now();
    const [s1, s2, s3] = await Promise.all([
      NativeBridge.execute('status'),
      NativeBridge.execute('status'),
      NativeBridge.execute('status'),
    ]);
    const elapsed = Date.now() - start;

    expect(s1.windowsCredManager).toBe(true);
    expect(s2.windowsCredManager).toBe(true);
    expect(s3.windowsCredManager).toBe(true);
    // Daemon multiplexing should be rapid
    expect(elapsed).toBeLessThan(3000);
  });
});
