import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  RegisterApplicationSchema,
  CreateAccountSchema,
  UpdateAccountSchema,
  AppError,
  IPC_CHANNELS,
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
});
