import crypto from 'crypto';
import { AppError, VaultLockStatus } from '@quickswap/shared';

export interface IVaultStorageProvider {
  get(key: string): Promise<string | null> | string | null;
  set(key: string, value: string): Promise<void> | void;
  remove(key: string): Promise<void> | void;
}

export class VaultGate {
  private static storageProvider: IVaultStorageProvider | null = null;
  private static isLockedState: boolean = true;
  private static masterKey: Buffer | null = null;
  private static failedAttempts: number = 0;
  private static lockoutUntil: number = 0;
  private static lastActivityTime: number = Date.now();
  private static autoLockMinutes: number = 0;

  private static readonly STORAGE_KEY_HASH = 'quickswap_master_pwd_hash';
  private static readonly STORAGE_KEY_SALT = 'quickswap_master_pwd_salt';
  private static readonly STORAGE_KEY_ITERATIONS = 'quickswap_master_pwd_iter';
  private static readonly ITERATIONS = 100_000;
  private static readonly KEY_LEN = 32;

  public static setStorageProvider(provider: IVaultStorageProvider): void {
    this.storageProvider = provider;
  }

  public static async hasMasterPassword(): Promise<boolean> {
    if (!this.storageProvider) return false;
    const hash = await this.storageProvider.get(this.STORAGE_KEY_HASH);
    return Boolean(hash);
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

  public static async setMasterPassword(password: string): Promise<boolean> {
    if (!this.storageProvider) {
      throw new AppError('SECURITY_VAULT_ERROR', 'Vault storage provider is not initialized.');
    }
    if (!password || password.length < 4) {
      throw new AppError('INVALID_INPUT', 'Master password must be at least 4 characters long.');
    }

    const salt = crypto.randomBytes(16);
    const derivedKey = crypto.pbkdf2Sync(
      password,
      salt,
      this.ITERATIONS,
      this.KEY_LEN,
      'sha256'
    );

    await this.storageProvider.set(this.STORAGE_KEY_SALT, salt.toString('hex'));
    await this.storageProvider.set(this.STORAGE_KEY_HASH, derivedKey.toString('hex'));
    await this.storageProvider.set(this.STORAGE_KEY_ITERATIONS, this.ITERATIONS.toString());

    // Keep active key in memory and unlock
    this.masterKey = derivedKey;
    this.isLockedState = false;
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    this.recordActivity();
    return true;
  }

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

    const saltHex = await this.storageProvider.get(this.STORAGE_KEY_SALT);
    const hashHex = await this.storageProvider.get(this.STORAGE_KEY_HASH);

    if (!saltHex || !hashHex) {
      // No master password configured: open vault
      this.isLockedState = false;
      this.failedAttempts = 0;
      return { success: true };
    }

    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');

    const derivedKey = crypto.pbkdf2Sync(
      password,
      salt,
      this.ITERATIONS,
      this.KEY_LEN,
      'sha256'
    );

    if (crypto.timingSafeEqual(derivedKey, expectedHash)) {
      this.masterKey = derivedKey;
      this.isLockedState = false;
      this.failedAttempts = 0;
      this.lockoutUntil = 0;
      this.recordActivity();
      return { success: true };
    } else {
      this.failedAttempts += 1;
      // Exponential lockout delay
      if (this.failedAttempts >= 10) {
        this.lockoutUntil = now + 300_000; // 5 minutes
      } else if (this.failedAttempts >= 5) {
        this.lockoutUntil = now + 30_000; // 30 seconds
      } else if (this.failedAttempts >= 3) {
        this.lockoutUntil = now + 5_000; // 5 seconds
      }

      throw new AppError('SECURITY_VAULT_ERROR', 'Incorrect master password.');
    }
  }

  public static lock(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    this.isLockedState = true;
  }

  public static async removeMasterPassword(currentPassword: string): Promise<boolean> {
    if (!this.storageProvider) return false;
    await this.unlock(currentPassword);

    await this.storageProvider.remove(this.STORAGE_KEY_HASH);
    await this.storageProvider.remove(this.STORAGE_KEY_SALT);
    await this.storageProvider.remove(this.STORAGE_KEY_ITERATIONS);

    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    this.isLockedState = false;
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    return true;
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
}
