import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  DatabaseConnection,
  AccountSecretsRepository,
} from '../packages/database/src';
import {
  ApplicationService,
  AccountService,
  RiotSessionManager,
  RiotAdapter,
  LauncherService,
} from '../packages/core/src';
import { CredentialVault } from '../packages/security/src';

describe('Riot Games Session Management & Auto-Login', () => {
  const testDbPath = path.resolve(__dirname, 'test-riot-session.db');
  const mockRiotDataDir = path.resolve(__dirname, 'mock-riot-data');
  const mockSettingsFile = path.join(mockRiotDataDir, 'RiotGamesPrivateSettings.yaml');

  let testAppId: string;
  let testAccountId: string;

  beforeAll(() => {
    DatabaseConnection.initialize(testDbPath);
    RiotSessionManager.setCustomDataDir(mockRiotDataDir);

    if (!fs.existsSync(mockRiotDataDir)) {
      fs.mkdirSync(mockRiotDataDir, { recursive: true });
    }

    // Register Riot Games application using node.exe as dummy executable for tests
    const app = ApplicationService.register({
      name: 'Riot Games',
      adapterId: 'riot',
      executablePath: process.execPath,
      category: 'games',
    });
    testAppId = app.id;
  });

  afterAll(async () => {
    RiotSessionManager.setCustomDataDir(null);
    DatabaseConnection.close();

    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // Ignore
      }
    }

    if (fs.existsSync(mockRiotDataDir)) {
      try {
        fs.rmSync(mockRiotDataDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    }

    if (testAccountId) {
      try {
        await CredentialVault.deleteAllForAccount(testAccountId);
      } catch {
        // Ignore
      }
    }
  });

  it('detects inactive session when file is missing or logged out', () => {
    if (fs.existsSync(mockSettingsFile)) {
      fs.unlinkSync(mockSettingsFile);
    }
    expect(RiotSessionManager.isSessionActive().active).toBe(false);

    // Write logged-out settings
    const loggedOutYaml = `
psl:
    authorization:
        riot-client: null
riot-login:
    persist: null
rso-authenticator:
    tdid:
        value: "dummy_tdid_cookie"
`;
    fs.writeFileSync(mockSettingsFile, loggedOutYaml, 'utf8');
    expect(RiotSessionManager.isSessionActive().active).toBe(false);
  });

  it('detects active authenticated session when tokens are present', () => {
    const activeYaml = `
psl:
    authorization:
        riot-client: "mock_client_auth_blob"
riot-login:
    persist:
        session: "mock_session_cookie_string"
rso-authenticator:
    access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock_token"
    refresh_token: "mock_refresh_token_value"
`;
    fs.writeFileSync(mockSettingsFile, activeYaml, 'utf8');
    expect(RiotSessionManager.isSessionActive().active).toBe(true);
  });

  it('captures and DPAPI-encrypts active session for an account', async () => {
    const account = await AccountService.create({
      applicationId: testAppId,
      displayName: 'Challenger Smurf',
      username: 'gamer_pro',
      password: 'SuperSecretPassword123!',
      region: 'EUW',
    });
    testAccountId = account.id;

    // Has no session initially
    expect(RiotSessionManager.hasSavedSession(testAccountId)).toBe(false);

    // Capture active session
    const res = await RiotSessionManager.captureActiveSession(testAccountId);
    expect(res.success).toBe(true);
    expect(res.message).toContain('successfully captured');

    // Account now reports session saved
    expect(RiotSessionManager.hasSavedSession(testAccountId)).toBe(true);

    // Secret reference is saved in database
    const secretRef = AccountSecretsRepository.getByAccountAndType(testAccountId, 'session_token');
    expect(secretRef).not.toBeNull();
    expect(secretRef?.credentialRef).toBeDefined();
    // Ciphertext must be DPAPI Base64, not plaintext yaml
    expect(secretRef?.credentialRef).not.toContain('psl:');
  });

  it('restores decrypted session file before launch', async () => {
    // Corrupt or clear the mock settings file to simulate another account/state
    fs.writeFileSync(mockSettingsFile, 'psl:\n  riot-client: null\nriot-login:\n  persist: null\n', 'utf8');
    expect(fs.readFileSync(mockSettingsFile, 'utf8')).not.toContain('Challenger Smurf');

    // Restore saved session
    const res = await RiotSessionManager.restoreSession(testAccountId);
    expect(res.success).toBe(true);

    // Verify restored file contents match the captured active tokens
    const restoredContent = fs.readFileSync(mockSettingsFile, 'utf8');
    expect(restoredContent).toContain('mock_client_auth_blob');
    expect(restoredContent).toContain('mock_session_cookie_string');
  });

  it('launches Riot Client with sessionRestored=true and autoLoginTriggered=true when session and credentials are paired', async () => {
    // Launch with force=true
    const result = await LauncherService.launch(testAccountId, true);
    expect(result.success).toBe(true);
    expect(result.sessionRestored).toBe(true);
    expect(result.autoLoginTriggered).toBe(true);
    expect(result.message).toContain('automatic login');
  });

  it('unlinks and clears session cleanly', async () => {
    await RiotSessionManager.clearSession(testAccountId);
    expect(RiotSessionManager.hasSavedSession(testAccountId)).toBe(false);

    const secretRef = AccountSecretsRepository.getByAccountAndType(testAccountId, 'session_token');
    expect(secretRef).toBeNull();
  });
});
