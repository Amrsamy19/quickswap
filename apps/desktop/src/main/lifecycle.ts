import { DatabaseConnection } from '@quickswap/database';
import { VaultGate } from '@quickswap/security';

let isQuitting = false;

export function isAppQuitting(): boolean {
  return isQuitting;
}

export function setAppQuitting(quitting: boolean): void {
  isQuitting = quitting;
}

export function isPortableExecutable(): boolean {
  return Boolean(
    process.env.PORTABLE_EXECUTABLE_DIR ||
    process.env.PORTABLE_EXECUTABLE_FILE ||
    process.env.PORTABLE_EXECUTABLE_APP_FILENAME
  );
}

/**
 * Prepares the application for a clean restart or update installation.
 * Locks the cryptographic vault to wipe keys from RAM and closes SQLite connections safely.
 */
export function prepareForAppQuitOrUpdate(): void {
  isQuitting = true;
  try {
    VaultGate.lock();
  } catch (err) {
    console.warn('[Quickswap] Pre-quit vault lock note:', err);
  }
  try {
    DatabaseConnection.close();
  } catch (err) {
    console.warn('[Quickswap] Pre-quit database close note:', err);
  }
}
