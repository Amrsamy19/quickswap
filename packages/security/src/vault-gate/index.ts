import crypto from 'crypto';
import { AppError, VaultLockStatus } from '@quickswap/shared';
import {
  deriveKek,
  aesGcmEncrypt,
  aesGcmDecrypt,
  EncryptedEnvelope,
  DEFAULT_PBKDF2_ITERATIONS,
  KEY_LENGTH_BYTES,
  SALT_LENGTH_BYTES,
} from '../encryption/envelope';

export interface IVaultStorageProvider {
  get(key: string): Promise<string | null> | string | null;
  set(key: string, value: string): Promise<void> | void;
  remove(key: string): Promise<void> | void;
}

const VAULT_CANARY_MESSAGE = 'QUICKSWAP_DEK_VERIFIED_V1';

export class VaultGate {
  private static storageProvider: IVaultStorageProvider | null = null;
  private static isLockedState: boolean = true;
  private static dek: Buffer | null = null;
  private static failedAttempts: number = 0;
  private static lockoutUntil: number = 0;
  private static lastActivityTime: number = Date.now();
  private static autoLockMinutes: number = 0;
  private static autoLockTimer: NodeJS.Timeout | null = null;
  private static lockListeners: Array<(status: VaultLockStatus) => void> = [];

  // Modern KEK/DEK Envelope storage keys
  private static readonly KEY_KDF_ALGO = 'vault_kdf_algo';
  private static readonly KEY_KDF_ITERATIONS = 'vault_kdf_iterations';
  private static readonly KEY_KDF_SALT = 'vault_kdf_salt';
  private static readonly KEY_WRAPPED_DEK = 'vault_wrapped_dek';
  private static readonly KEY_DEK_CHECK = 'vault_dek_check';
  private static readonly KEY_HAS_MASTER_PWD = 'vault_has_master_pwd';

  // Legacy (v1.0) PBKDF2 hash keys for migration
  private static readonly LEGACY_KEY_HASH = 'quickswap_master_pwd_hash';
  private static readonly LEGACY_KEY_SALT = 'quickswap_master_pwd_salt';
  private static readonly LEGACY_KEY_ITERATIONS = 'quickswap_master_pwd_iter';

  public static setStorageProvider(provider: IVaultStorageProvider): void {
    this.storageProvider = provider;
  }

  public static async hasMasterPassword(): Promise<boolean> {
    if (!this.storageProvider) return false;
    try {
      const modernFlag = await this.storageProvider.get(this.KEY_HAS_MASTER_PWD);
      if (modernFlag === 'true') return true;

      const wrappedDek = await this.storageProvider.get(this.KEY_WRAPPED_DEK);
      if (wrappedDek) return true;

      // Check legacy v1.0 hash
      const legacyHash = await this.storageProvider.get(this.LEGACY_KEY_HASH);
      return Boolean(legacyHash);
    } catch {
      return false;
    }
  }

  public static async getStatus(): Promise<VaultLockStatus> {
    const hasPwd = await this.hasMasterPassword();
    const now = Date.now();
    const isLockedOut = this.lockoutUntil > now;
    const remainingSeconds = isLockedOut ? Math.ceil((this.lockoutUntil - now) / 1000) : 0;

    return {
      isLocked: hasPwd ? this.isLockedState : false,
      hasMasterPassword: hasPwd,
      failedAttempts: this.failedAttempts,
      isLockedOut,
      lockoutRemainingSeconds: remainingSeconds,
      autoLockMinutes: this.autoLockMinutes,
    };
  }

  /**
   * Retrieves the active Data Encryption Key (DEK).
   * Throws if the vault is locked.
   */
  public static getDEK(): Buffer {
    if (this.isLockedState || !this.dek) {
      throw new AppError(
        'SECURITY_VAULT_ERROR',
        'Vault is locked. Unlock Quickswap with your master password to access encrypted data.'
      );
    }
    return this.dek;
  }

  /**
   * Sets or initializes the master password using a KEK/DEK envelope.
   * Generates a random 256-bit DEK, derives a KEK via PBKDF2-SHA256 (600,000 iterations),
   * wraps the DEK with AES-256-GCM, and stores parameters and canary token.
   */
  public static async setMasterPassword(password: string): Promise<boolean> {
    if (!this.storageProvider) {
      throw new AppError('SECURITY_VAULT_ERROR', 'Vault storage provider is not initialized.');
    }
    if (!password || password.length < 4) {
      throw new AppError('INVALID_INPUT', 'Master password must be at least 4 characters long.');
    }

    // 1. Generate or reuse random 32-byte DEK
    const dek = this.dek && this.dek.length === KEY_LENGTH_BYTES
      ? Buffer.from(this.dek)
      : crypto.randomBytes(KEY_LENGTH_BYTES);

    // 2. Generate 32-byte cryptographic salt for KDF
    const salt = crypto.randomBytes(SALT_LENGTH_BYTES);
    const iterations = DEFAULT_PBKDF2_ITERATIONS;

    // 3. Derive Key-Encryption Key (KEK)
    const kek = deriveKek(password, salt, iterations, KEY_LENGTH_BYTES);

    // 4. Wrap DEK with KEK using AES-256-GCM
    const wrappedDek = aesGcmEncrypt(dek, kek);

    // 5. Encrypt canary token with DEK to verify future unwrapping
    const canaryCheck = aesGcmEncrypt(VAULT_CANARY_MESSAGE, dek);

    // Clean up temporary KEK buffer
    kek.fill(0);

    // 6. Persist envelope metadata
    await this.storageProvider.set(this.KEY_KDF_ALGO, 'pbkdf2-sha256');
    await this.storageProvider.set(this.KEY_KDF_ITERATIONS, iterations.toString());
    await this.storageProvider.set(this.KEY_KDF_SALT, salt.toString('hex'));
    await this.storageProvider.set(this.KEY_WRAPPED_DEK, JSON.stringify(wrappedDek));
    await this.storageProvider.set(this.KEY_DEK_CHECK, JSON.stringify(canaryCheck));
    await this.storageProvider.set(this.KEY_HAS_MASTER_PWD, 'true');

    // Remove any legacy keys
    await this.clearLegacyKeys();

    // 7. Retain DEK in memory and unlock
    if (this.dek) {
      this.dek.fill(0);
    }
    this.dek = dek;
    this.isLockedState = false;
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    this.recordActivity();
    this.notifyLockListeners();

    return true;
  }

  /**
   * Unlocks the vault by deriving the KEK and unwrapping the DEK.
   * If a legacy vault format is detected, it automatically migrates the vault
   * to the modern KEK/DEK envelope with 600,000 iterations.
   */
  public static async unlock(password: string): Promise<{ success: boolean; message?: string }> {
    if (!this.storageProvider) {
      throw new AppError('SECURITY_VAULT_ERROR', 'Vault storage provider is not initialized.');
    }

    const now = Date.now();
    if (this.lockoutUntil > now) {
      const waitSec = Math.ceil((this.lockoutUntil - now) / 1000);
      throw new AppError(
        'SECURITY_VAULT_ERROR',
        `Too many failed attempts. Vault is temporarily locked. Try again in ${waitSec} seconds.`
      );
    }

    const hasPwd = await this.hasMasterPassword();
    if (!hasPwd) {
      // No master password configured: open vault
      this.isLockedState = false;
      this.failedAttempts = 0;
      this.notifyLockListeners();
      return { success: true };
    }

    const wrappedDekRaw = await this.storageProvider.get(this.KEY_WRAPPED_DEK);
    const saltHex = await this.storageProvider.get(this.KEY_KDF_SALT);
    const iterStr = await this.storageProvider.get(this.KEY_KDF_ITERATIONS);
    const checkRaw = await this.storageProvider.get(this.KEY_DEK_CHECK);

    // Migration path: check if legacy v1.0 vault exists
    if (!wrappedDekRaw || !saltHex || !checkRaw) {
      const legacyHashHex = await this.storageProvider.get(this.LEGACY_KEY_HASH);
      const legacySaltHex = await this.storageProvider.get(this.LEGACY_KEY_SALT);

      if (legacyHashHex && legacySaltHex) {
        return this.unlockAndMigrateLegacy(password, legacySaltHex, legacyHashHex);
      }
    }

    if (!wrappedDekRaw || !saltHex || !checkRaw) {
      throw new AppError('SECURITY_VAULT_ERROR', 'Corrupted vault metadata. Key parameters missing.');
    }

    try {
      const salt = Buffer.from(saltHex, 'hex');
      const iterations = iterStr ? parseInt(iterStr, 10) : DEFAULT_PBKDF2_ITERATIONS;
      const wrappedDek: EncryptedEnvelope = JSON.parse(wrappedDekRaw);
      const checkEnv: EncryptedEnvelope = JSON.parse(checkRaw);

      // Derive KEK
      const kek = deriveKek(password, salt, iterations, KEY_LENGTH_BYTES);

      // Unwrap DEK with KEK
      let unwrappedDek: Buffer;
      try {
        unwrappedDek = aesGcmDecrypt(wrappedDek, kek);
      } finally {
        kek.fill(0);
      }

      // Verify DEK with canary token
      const verified = aesGcmDecrypt(checkEnv, unwrappedDek).toString('utf8');
      if (verified !== VAULT_CANARY_MESSAGE) {
        unwrappedDek.fill(0);
        throw new Error('Canary mismatch');
      }

      // Unlock successful
      if (this.dek) {
        this.dek.fill(0);
      }
      this.dek = unwrappedDek;
      this.isLockedState = false;
      this.failedAttempts = 0;
      this.lockoutUntil = 0;
      this.recordActivity();
      this.notifyLockListeners();
      return { success: true };
    } catch {
      this.handleFailedAttempt(now);
      throw new AppError('SECURITY_VAULT_ERROR', 'Incorrect master password.');
    }
  }

  /**
   * Automatic migration for legacy vaults: verifies legacy password hash,
   * generates a fresh DEK, derives a 600,000-iteration KEK, wraps the DEK,
   * updates storage, and removes legacy keys.
   */
  private static async unlockAndMigrateLegacy(
    password: string,
    legacySaltHex: string,
    legacyHashHex: string
  ): Promise<{ success: boolean; message?: string }> {
    const salt = Buffer.from(legacySaltHex, 'hex');
    const expectedHash = Buffer.from(legacyHashHex, 'hex');

    // Legacy used 100,000 iterations
    const derivedLegacy = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256');

    if (!crypto.timingSafeEqual(derivedLegacy, expectedHash)) {
      this.handleFailedAttempt(Date.now());
      throw new AppError('SECURITY_VAULT_ERROR', 'Incorrect master password.');
    }

    // Password verified! Now migrate to modern KEK/DEK envelope with 600,000 iterations
    await this.setMasterPassword(password);
    return { success: true, message: 'Vault successfully upgraded to KEK/DEK envelope encryption (600,000 iterations).' };
  }

  private static handleFailedAttempt(now: number): void {
    this.failedAttempts += 1;
    // Exponential lockout delay
    if (this.failedAttempts >= 10) {
      this.lockoutUntil = now + 300_000; // 5 minutes
    } else if (this.failedAttempts >= 5) {
      this.lockoutUntil = now + 30_000; // 30 seconds
    } else if (this.failedAttempts >= 3) {
      this.lockoutUntil = now + 5_000; // 5 seconds
    }
  }

  /**
   * Locks the vault immediately and zeros out all encryption keys from memory.
   */
  public static lock(): void {
    if (this.dek) {
      this.dek.fill(0);
      this.dek = null;
    }
    this.isLockedState = true;
    this.notifyLockListeners();
  }

  /**
   * Changes the master password.
   * Derives a new KEK from newPassword and re-wraps the SAME DEK.
   * Existing encrypted data remains valid without requiring mass re-encryption.
   */
  public static async changeMasterPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    if (!this.storageProvider) {
      throw new AppError('SECURITY_VAULT_ERROR', 'Vault storage provider is not initialized.');
    }
    if (!newPassword || newPassword.length < 4) {
      throw new AppError('INVALID_INPUT', 'New master password must be at least 4 characters long.');
    }

    // Verify current password first
    await this.unlock(currentPassword);

    const activeDek = this.getDEK();

    // Generate new salt and derive new KEK
    const newSalt = crypto.randomBytes(SALT_LENGTH_BYTES);
    const iterations = DEFAULT_PBKDF2_ITERATIONS;
    const newKek = deriveKek(newPassword, newSalt, iterations, KEY_LENGTH_BYTES);

    // Re-wrap the existing DEK with the new KEK
    const wrappedDek = aesGcmEncrypt(activeDek, newKek);
    const canaryCheck = aesGcmEncrypt(VAULT_CANARY_MESSAGE, activeDek);

    newKek.fill(0);

    // Update storage
    await this.storageProvider.set(this.KEY_KDF_ALGO, 'pbkdf2-sha256');
    await this.storageProvider.set(this.KEY_KDF_ITERATIONS, iterations.toString());
    await this.storageProvider.set(this.KEY_KDF_SALT, newSalt.toString('hex'));
    await this.storageProvider.set(this.KEY_WRAPPED_DEK, JSON.stringify(wrappedDek));
    await this.storageProvider.set(this.KEY_DEK_CHECK, JSON.stringify(canaryCheck));
    await this.storageProvider.set(this.KEY_HAS_MASTER_PWD, 'true');

    this.recordActivity();
    return { success: true };
  }

  /**
   * Resets and wipes the vault master password and key envelope.
   * Requires explicit confirmation string 'RESET-VAULT'.
   */
  public static async resetVault(confirmation: string): Promise<{ success: boolean }> {
    if (confirmation !== 'RESET-VAULT') {
      throw new AppError('INVALID_INPUT', 'Vault reset rejected. Confirmation must match "RESET-VAULT".');
    }
    if (!this.storageProvider) return { success: false };

    this.lock();

    await this.storageProvider.remove(this.KEY_KDF_ALGO);
    await this.storageProvider.remove(this.KEY_KDF_ITERATIONS);
    await this.storageProvider.remove(this.KEY_KDF_SALT);
    await this.storageProvider.remove(this.KEY_WRAPPED_DEK);
    await this.storageProvider.remove(this.KEY_DEK_CHECK);
    await this.storageProvider.remove(this.KEY_HAS_MASTER_PWD);
    await this.clearLegacyKeys();

    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    this.isLockedState = false;
    this.notifyLockListeners();
    return { success: true };
  }

  public static async removeMasterPassword(currentPassword: string): Promise<boolean> {
    if (!this.storageProvider) return false;
    await this.unlock(currentPassword);
    const res = await this.resetVault('RESET-VAULT');
    return res.success;
  }

  private static async clearLegacyKeys(): Promise<void> {
    if (!this.storageProvider) return;
    await this.storageProvider.remove(this.LEGACY_KEY_HASH);
    await this.storageProvider.remove(this.LEGACY_KEY_SALT);
    await this.storageProvider.remove(this.LEGACY_KEY_ITERATIONS);
  }

  public static async assertUnlocked(): Promise<void> {
    const hasPwd = await this.hasMasterPassword();
    if (hasPwd && this.isLockedState) {
      throw new AppError(
        'SECURITY_VAULT_ERROR',
        'Vault is locked. Unlock Quickswap to access credentials or launch accounts.'
      );
    }
  }

  public static recordActivity(): void {
    this.lastActivityTime = Date.now();
  }

  public static setAutoLockMinutes(minutes: number): void {
    this.autoLockMinutes = Math.max(0, minutes);
  }

  public static checkAutoLock(): boolean {
    if (this.autoLockMinutes <= 0 || this.isLockedState) {
      return false;
    }

    const elapsed = Date.now() - this.lastActivityTime;
    if (elapsed > this.autoLockMinutes * 60 * 1000) {
      this.lock();
      return true;
    }
    return false;
  }

  public static startAutoLockTimer(checkIntervalMs: number = 10_000): void {
    this.stopAutoLockTimer();
    this.autoLockTimer = setInterval(() => {
      this.checkAutoLock();
    }, checkIntervalMs);
  }

  public static stopAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearInterval(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  public static onLockStateChange(listener: (status: VaultLockStatus) => void): () => void {
    this.lockListeners.push(listener);
    return () => {
      this.lockListeners = this.lockListeners.filter((l) => l !== listener);
    };
  }

  private static notifyLockListeners(): void {
    this.getStatus().then((status) => {
      for (const listener of this.lockListeners) {
        try {
          listener(status);
        } catch {}
      }
    });
  }
}
