import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseConnection } from '@quickswap/database';
import { SettingsRepository } from '@quickswap/database';
import { AppSettingsService } from '@quickswap/core';
import { VaultGate } from '@quickswap/security';
import {
  IPC_CHANNELS,
  GITHUB_REPO_URL,
  GITHUB_RELEASES_URL,
  GITHUB_LATEST_RELEASE_URL,
  UpdateSettingsSchema,
} from '@quickswap/shared';
import { isPortableExecutable, prepareForAppQuitOrUpdate, isAppQuitting, setAppQuitting } from '../apps/desktop/src/main/lifecycle';

describe('Auto-Updater & Settings Gap Fixes', () => {
  let tempDir: string;
  let testDbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quickswap-updater-test-'));
    testDbPath = path.join(tempDir, 'test.db');
    DatabaseConnection.initialize(testDbPath);
  });

  afterEach(() => {
    setAppQuitting(false);
    try {
      DatabaseConnection.close();
    } catch {}
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Settings Gap Fixes (Auto-Check & Auto-Download preferences)', () => {
    it('initializes default settings with autoCheckUpdates=true and autoDownloadUpdates=false', () => {
      const settings = SettingsRepository.getSettings();
      expect(settings.autoCheckUpdates).toBe(true);
      expect(settings.autoDownloadUpdates).toBe(false);
    });

    it('validates and persists autoCheckUpdates and autoDownloadUpdates updates', () => {
      const validated = UpdateSettingsSchema.parse({
        autoCheckUpdates: false,
        autoDownloadUpdates: true,
      });

      const updated = AppSettingsService.update(validated);
      expect(updated.autoCheckUpdates).toBe(false);
      expect(updated.autoDownloadUpdates).toBe(true);

      const refreshed = AppSettingsService.get();
      expect(refreshed.autoCheckUpdates).toBe(false);
      expect(refreshed.autoDownloadUpdates).toBe(true);
    });
  });

  describe('Auto-Updater Constants & URL Safety', () => {
    it('defines secure IPC channels for updater and external shell', () => {
      expect(IPC_CHANNELS.UPDATER_CHECK_FOR_UPDATES).toBe('updater:checkForUpdates');
      expect(IPC_CHANNELS.UPDATER_DOWNLOAD).toBe('updater:downloadUpdate');
      expect(IPC_CHANNELS.UPDATER_INSTALL).toBe('updater:installUpdate');
      expect(IPC_CHANNELS.UPDATER_GET_STATUS).toBe('updater:getStatus');
      expect(IPC_CHANNELS.UPDATER_STATUS_CHANGED).toBe('updater:statusChanged');
      expect(IPC_CHANNELS.SHELL_OPEN_EXTERNAL).toBe('shell:openExternal');
    });

    it('points fallback links exclusively to verified HTTPS GitHub repository URLs', () => {
      expect(GITHUB_REPO_URL).toBe('https://github.com/Amrsamy19/quickswap');
      expect(GITHUB_RELEASES_URL).toBe('https://github.com/Amrsamy19/quickswap/releases');
      expect(GITHUB_LATEST_RELEASE_URL).toBe('https://github.com/Amrsamy19/quickswap/releases/latest');
    });
  });

  describe('Portable Executable Detection (Gap 2)', () => {
    const originalEnv = process.env.PORTABLE_EXECUTABLE_DIR;

    afterEach(() => {
      if (originalEnv) {
        process.env.PORTABLE_EXECUTABLE_DIR = originalEnv;
      } else {
        delete process.env.PORTABLE_EXECUTABLE_DIR;
      }
    });

    it('correctly identifies portable environment from process.env', () => {
      delete process.env.PORTABLE_EXECUTABLE_DIR;
      expect(isPortableExecutable()).toBe(false);

      process.env.PORTABLE_EXECUTABLE_DIR = 'C:\\PortableApps\\Quickswap';
      expect(isPortableExecutable()).toBe(true);
    });
  });

  describe('Safe Shutdown Lifecycle on Update Restart (Gap 1 & Gap 3)', () => {
    it('locks vault, zeroes DEK from memory, and marks isQuitting=true upon prepareForAppQuitOrUpdate', async () => {
      // Setup master password and unlock
      await VaultGate.setMasterPassword('SafeShutdownTestPass123!');
      const unlockRes = await VaultGate.unlock('SafeShutdownTestPass123!');
      expect(unlockRes.success).toBe(true);
      expect(() => VaultGate.getDEK()).not.toThrow();

      // Execute safe pre-update shutdown
      prepareForAppQuitOrUpdate();

      // Verify isQuitting flag prevents window close interception
      expect(isAppQuitting()).toBe(true);

      // Verify Vault was actively locked and DEK wiped from memory
      expect(() => VaultGate.getDEK()).toThrow(/Vault is locked/i);
    });
  });
});
