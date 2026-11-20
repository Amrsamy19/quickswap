import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  VaultGate,
  DpapiVault,
  deriveKek,
  aesGcmEncrypt,
  aesGcmDecrypt,
  encryptString,
  decryptString,
  WindowsNativeBridge,
  IHelperIntegrityVerifier,
  MockNativeBridge,
  NativeBridge,
} from '../packages/security/src';
import {
  DatabaseConnection,
  ActivityLogRepository,
  SettingsRepository,
} from '../packages/database/src';
import {
  RiotSessionManager,
  ActivityService,
  CoreSecurityService,
} from '../packages/core/src';
import {
  AppError,
  CreateAccountSchema,
  SetMasterPasswordSchema,
  ChangeMasterPasswordSchema,
  ResetVaultSchema,
} from '../packages/shared/src';
import { assertValidIpcSender } from '../apps/desktop/src/main/ipc/ipc-security';

describe('Phase 1 Security Hardening Tests', () => {
  const testDbPath = path.resolve(__dirname, 'test-phase1.db');

  beforeEach(() => {
    // Set up active test database with migrations
    DatabaseConnection.initialize(testDbPath);
    NativeBridge.setBridge(new MockNativeBridge());
  });

  afterEach(() => {
    VaultGate.lock();
    DatabaseConnection.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      // clean backups
      const files = fs.readdirSync(__dirname);
      for (const f of files) {
        if (f.startsWith('test-phase1.db')) {
          fs.unlinkSync(path.join(__dirname, f));
        }
      }
    } catch {}
  });

  // 1. Key derivation and wrapping
  it('derives 600,000-iteration KEK, wraps DEK with AES-256-GCM, and unwraps successfully', async () => {
    const memoryStore = new Map<string, string>();
    VaultGate.setStorageProvider({
      get: (k) => memoryStore.get(k) || null,
      set: (k, v) => { memoryStore.set(k, v); },
      remove: (k) => { memoryStore.delete(k); },
    });

    const masterPwd = 'Ultra-Secure-Password-2026!';
    await VaultGate.setMasterPassword(masterPwd);

    expect(memoryStore.get('vault_kdf_algo')).toBe('pbkdf2-sha256');
    expect(memoryStore.get('vault_kdf_iterations')).toBe('600000');
    expect(memoryStore.get('vault_has_master_pwd')).toBe('true');

    // DEK should be accessible in memory
    const dek = VaultGate.getDEK();
    expect(dek).toBeDefined();
    expect(dek.length).toBe(32);

    // Encrypt & decrypt data with DEK
    const testSecret = 'SuperSecretAccountCredentials';
    const encrypted = encryptString(testSecret, dek);
    expect(encrypted.startsWith('enc:v1:')).toBe(true);

    const decrypted = decryptString(encrypted, dek);
    expect(decrypted).toBe(testSecret);
  });

  // 2. Migration of an old vault
  it('automatically detects and upgrades a legacy 100,000-iteration PBKDF2 vault to 600,000-iteration KEK/DEK', async () => {
    const memoryStore = new Map<string, string>();
    VaultGate.setStorageProvider({
      get: (k) => memoryStore.get(k) || null,
      set: (k, v) => { memoryStore.set(k, v); },
      remove: (k) => { memoryStore.delete(k); },
    });

    // Populate simulated legacy v1.0 PBKDF2 hash (100,000 iterations)
    const oldPassword = 'OldLegacyPassword123!';
    const legacySalt = crypto.randomBytes(16);
    const legacyHash = crypto.pbkdf2Sync(oldPassword, legacySalt, 100_000, 32, 'sha256');

    memoryStore.set('quickswap_master_pwd_salt', legacySalt.toString('hex'));
    memoryStore.set('quickswap_master_pwd_hash', legacyHash.toString('hex'));
    memoryStore.set('quickswap_master_pwd_iter', '100000');

    // Unlock should identify legacy vault and migrate it
    const res = await VaultGate.unlock(oldPassword);
    expect(res.success).toBe(true);
    expect(res.message).toContain('600,000 iterations');

    // Legacy keys should be removed, modern envelope keys installed
    expect(memoryStore.has('quickswap_master_pwd_hash')).toBe(false);
    expect(memoryStore.get('vault_kdf_iterations')).toBe('600000');
    expect(memoryStore.has('vault_wrapped_dek')).toBe(true);
    expect(memoryStore.has('vault_dek_check')).toBe(true);

    // Vault should be unlocked with a valid DEK
    expect(VaultGate.getDEK().length).toBe(32);
  });

  // 3. Wrong password and backoff
  it('enforces exponential backoff lockout upon consecutive wrong master passwords', async () => {
    const memoryStore = new Map<string, string>();
    VaultGate.setStorageProvider({
      get: (k) => memoryStore.get(k) || null,
      set: (k, v) => { memoryStore.set(k, v); },
      remove: (k) => { memoryStore.delete(k); },
    });

    await VaultGate.setMasterPassword('CorrectMasterPassword!');
    VaultGate.lock();

    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
      try {
        await VaultGate.unlock('WrongPassword');
      } catch (err: any) {
        expect(err.message).toContain('Incorrect master password');
      }
    }

    // 4th attempt should hit lockout
    try {
      await VaultGate.unlock('WrongPassword');
      expect.fail('Should have thrown lockout error');
    } catch (err: any) {
      expect(err.message).toContain('Vault is temporarily locked');
    }
  });

  // 4. Lock / unlock and Change Password
  it('clears DEK from memory upon lock and supports password change without re-encrypting data', async () => {
    const memoryStore = new Map<string, string>();
    VaultGate.setStorageProvider({
      get: (k) => memoryStore.get(k) || null,
      set: (k, v) => { memoryStore.set(k, v); },
      remove: (k) => { memoryStore.delete(k); },
    });

    await VaultGate.setMasterPassword('OriginalPassword123');
    const originalDek = Buffer.from(VaultGate.getDEK());

    // Lock vault: memory should be scrubbed
    VaultGate.lock();
    expect(() => VaultGate.getDEK()).toThrow('Vault is locked');

    // Change master password
    await VaultGate.changeMasterPassword('OriginalPassword123', 'NewMasterPassword456');

    // DEK should remain the same underlying key!
    const newDek = VaultGate.getDEK();
    expect(newDek.equals(originalDek)).toBe(true);

    // Old password fails to unlock
    VaultGate.lock();
    await expect(VaultGate.unlock('OriginalPassword123')).rejects.toThrow();

    // New password unlocks successfully
    const unlockRes = await VaultGate.unlock('NewMasterPassword456');
    expect(unlockRes.success).toBe(true);
  });

  // 5. Helper tamper detection (using a mock)
  it('detects binary tampering and halts execution when helper integrity fails', async () => {
    const bridge = new WindowsNativeBridge();

    // Mock verifier that flags tampering
    const mockTamperVerifier: IHelperIntegrityVerifier = {
      verify: (_path: string) => false, // simulate hash mismatch / signature invalid
    };

    bridge.setIntegrityVerifier(mockTamperVerifier);

    await expect(bridge.verifyBinaryIntegrity('fake/path/QuickswapSecHelper.exe')).rejects.toThrow(
      'failed integrity verification'
    );
  });

  // 6. Riot crash recovery
  it('safely recovers Riot session from encrypted backup after crash or abrupt kill', async () => {
    const tempRiotDir = path.resolve(__dirname, 'mock-riot-data');
    if (!fs.existsSync(tempRiotDir)) fs.mkdirSync(tempRiotDir, { recursive: true });

    RiotSessionManager.setCustomDataDir(tempRiotDir);

    const originalSessionYaml = 'riot-login:\n  persist: valid_original_token';
    const targetPath = RiotSessionManager.getPrivateSettingsPath();

    // Simulate encrypted backup left by crash
    const backupEncPath = `${targetPath}.bak.enc`;
    const encryptedBackup = await DpapiVault.protect(originalSessionYaml);
    fs.writeFileSync(backupEncPath, encryptedBackup, 'utf8');

    // Corrupted or temporary file left on disk
    fs.writeFileSync(targetPath, 'temporary_swapped_content', 'utf8');

    // Save crash recovery marker
    SettingsRepository.setRaw(
      'riot_active_launch_state',
      JSON.stringify({
        accountId: 'acc-crash-test',
        targetPath,
        backupEncPath,
        launchedAt: new Date().toISOString(),
      })
    );

    // Run crash recovery
    const recoveryRes = await RiotSessionManager.recoverFromCrash();
    expect(recoveryRes.recovered).toBe(true);

    // Plaintext should be restored to original
    const restoredContent = fs.readFileSync(targetPath, 'utf8');
    expect(restoredContent).toBe(originalSessionYaml);

    // Encrypted backup and marker should be cleanly removed
    expect(fs.existsSync(backupEncPath)).toBe(false);
    expect(SettingsRepository.getRaw('riot_active_launch_state')).toBeNull();

    // Cleanup
    try {
      fs.rmSync(tempRiotDir, { recursive: true, force: true });
    } catch {}
    RiotSessionManager.setCustomDataDir(null);
  });

  // 7. IPC rejection of malformed or foreign-origin calls
  it('rejects IPC calls with missing or foreign-origin sender frames', () => {
    // Missing frame
    expect(() => {
      assertValidIpcSender({ senderFrame: null } as any);
    }).toThrow('missing sender frame');

    // Foreign / web origin
    expect(() => {
      assertValidIpcSender({
        senderFrame: { url: 'https://evil-hacker.com/exploit.html' },
      } as any);
    }).toThrow('untrusted origin');

    // Valid local origin (file://)
    expect(() => {
      assertValidIpcSender({
        senderFrame: { url: 'file:///C:/Users/amrsa/AppData/Local/Quickswap/app/index.html' },
      } as any);
    }).not.toThrow();
  });

  it('rejects malformed IPC payloads through Zod schemas', () => {
    expect(() => {
      CreateAccountSchema.parse({
        applicationId: '', // invalid
        displayName: '',   // invalid
      });
    }).toThrow();

    expect(() => {
      ChangeMasterPasswordSchema.parse({
        currentPassword: '',
        newPassword: '12', // too short (< 4 chars)
      });
    }).toThrow();

    expect(() => {
      ResetVaultSchema.parse({
        confirmation: 'WRONG-TEXT', // must be 'RESET-VAULT'
      });
    }).toThrow();
  });

  // 8. Tamper-evident Audit Log hash chain
  it('creates cryptographic hash chain for activity logs and detects direct database tampering', () => {
    ActivityService.clear();

    ActivityService.log('system_startup', 'system', null, 'System Started', 'Startup details');
    ActivityService.log('account_created', 'account', 'acc-1', 'Created Account', 'Account 1 created');
    ActivityService.log('credentials_saved', 'security', 'acc-1', 'Saved Password', 'Credentials secured');

    // 1. Initial verification should succeed
    const initialCheck = ActivityLogRepository.verifyIntegrityChain();
    expect(initialCheck.valid).toBe(true);
    expect(initialCheck.totalChecked).toBe(3);

    // 2. Direct database tampering: alter the details of an entry directly in SQLite
    const db = DatabaseConnection.getInstance();
    db.prepare("UPDATE activity_logs SET details = 'HACKED_DATA' WHERE action = 'account_created'").run();

    // 3. Verification should now FAIL and flag the exact tampered entry
    const tamperedCheck = ActivityLogRepository.verifyIntegrityChain();
    expect(tamperedCheck.valid).toBe(false);
    expect(tamperedCheck.message).toContain('Audit log tamper detected');
  });
});
