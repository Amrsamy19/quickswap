import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseConnection, LaunchHistoryRepository } from '../packages/database/src';
import {
  ApplicationService,
  AccountService,
  LauncherService,
  ProcessMonitor,
} from '../packages/core/src';
import path from 'path';
import fs from 'fs';

describe('Milestone 4: Universal Launcher & Process Monitoring', () => {
  const testDbPath = path.resolve(__dirname, 'test-launcher.db');

  beforeAll(() => {
    DatabaseConnection.initialize(testDbPath);
  });

  afterAll(() => {
    DatabaseConnection.close();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // Ignore
      }
    }
  });

  it('detects running Windows processes via ProcessMonitor', async () => {
    // Current node.exe process is definitely running
    const nodeExe = process.execPath;
    const status = await ProcessMonitor.isRunning(nodeExe);

    expect(status.isRunning).toBe(true);
    expect(status.pid).toBeDefined();
    expect(status.processName?.toLowerCase()).toContain('node');

    // Non-existent process should report false
    const fakeStatus = await ProcessMonitor.isRunning('C:\\Windows\\NonExistentFakeProcess98765.exe');
    expect(fakeStatus.isRunning).toBe(false);
  });

  it('handles launch workflow, updates lastUsedAt and logs history', async () => {
    // Register application using current node executable
    const app = ApplicationService.register({
      name: 'Node Runner App',
      adapterId: 'generic',
      executablePath: process.execPath,
      category: 'utilities',
    });

    const account = await AccountService.create({
      applicationId: app.id,
      displayName: 'CLI Bot Account',
      username: 'bot_1',
      authMethod: 'manual',
      launchArguments: '-e "console.log(123); process.exit(0);"',
    });

    expect(account.lastUsedAt).toBeNull();

    // Launch with force=true (since node is already running)
    const result = await LauncherService.launch(account.id, true);
    expect(result.success).toBe(true);
    expect(result.pid).toBeDefined();

    // Verify account's lastUsedAt was updated
    const refreshed = AccountService.getById(account.id);
    expect(refreshed?.lastUsedAt).not.toBeNull();

    // Verify launch history was recorded in database
    const history = LauncherService.getHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].accountId).toBe(account.id);
    expect(history[0].status).toBe('success');
  });

  it('warns when launching an application that is already active without force', async () => {
    const app = ApplicationService.register({
      name: 'Active Node App',
      adapterId: 'generic',
      executablePath: process.execPath,
    });

    const account = await AccountService.create({
      applicationId: app.id,
      displayName: 'Active Account',
    });

    // Launch without force when node is already running
    const result = await LauncherService.launch(account.id, false);
    expect(result.success).toBe(false);
    expect(result.alreadyRunning).toBe(true);
    expect(result.message).toContain('currently running');
  });
});
