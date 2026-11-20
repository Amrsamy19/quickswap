import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ApplicationAdapter, LaunchContext } from './base.adapter';
import { ApplicationCapabilities, LaunchResult } from '@quickswap/shared';
import { ProcessMonitor } from '../launcher/process-monitor';
import { RiotSessionManager } from './riot.session';
import { CredentialVault, AutoLoginService } from '@quickswap/security';

export class RiotAdapter implements ApplicationAdapter {
  public readonly id = 'riot';
  public readonly name = 'Riot Games';

  public readonly capabilities: ApplicationCapabilities = {
    credentials: true,
    sessions: true,
    multipleInstances: false,
    accountIdentification: true,
    sessionValidation: true,
    manualLogin: true,
  };

  public async detectInstallation(): Promise<boolean> {
    const p = await this.getExecutablePath();
    return Boolean(p && fs.existsSync(p));
  }

  public async getExecutablePath(): Promise<string | null> {
    const trackerPath = 'C:\\ProgramData\\Riot Games\\RiotClientInstalls.json';
    if (fs.existsSync(trackerPath)) {
      try {
        const raw = fs.readFileSync(trackerPath, 'utf8');
        const parsed = JSON.parse(raw);
        const exe = parsed.rc_live || parsed.rc_default || parsed.rc_beta;
        if (exe && fs.existsSync(exe)) return exe;
      } catch {
        // Fallback
      }
    }

    const defaultPaths = [
      'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
      'D:\\Riot Games\\Riot Client\\RiotClientServices.exe',
      'E:\\Riot Games\\Riot Client\\RiotClientServices.exe',
    ];

    for (const p of defaultPaths) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  public async getRunningStatus(executablePath: string): Promise<boolean> {
    const status = await ProcessMonitor.isRunning(executablePath);
    return status.isRunning;
  }

  public async launch(context: LaunchContext): Promise<LaunchResult> {
    let sessionRestored = false;
    let autoLoginTriggered = false;
    let requiresManualLogin = false;
    let message = `Launched Riot Client for "${context.displayName}"`;

    // 1. Check if a saved DPAPI session exists for this account
    if (RiotSessionManager.hasSavedSession(context.accountId)) {
      try {
        const restoreRes = await RiotSessionManager.restoreSession(context.accountId);
        if (restoreRes.success) {
          sessionRestored = true;
          message = `Restored session and launched Riot Client for "${context.displayName}"`;
        }
      } catch (err: any) {
        console.warn(`Failed to restore session: ${err.message}`);
      }
    }

    // 2. Always arm automated login when credentials are saved
    try {
      const cred = await CredentialVault.getCredential(context.accountId, 'password');
      const loginUser = context.username || cred?.username;
      if (cred?.password && loginUser) {
        // Trigger automated login: wait for window, focus, fill username & password, press Enter
        AutoLoginService.triggerBackgroundAutoLogin('Riot Client', loginUser, context.accountId, 35);
        autoLoginTriggered = true;
        message = `Launched Riot Client with automatic login for "${context.displayName}"`;
      } else if (!sessionRestored) {
        requiresManualLogin = true;
        message = `Launched Riot Client for "${context.displayName}". Please enter your credentials.`;
      }
    } catch {
      if (!sessionRestored) {
        requiresManualLogin = true;
      }
    }

    const args: string[] = [];

    // Apply custom arguments if configured
    if (context.arguments && context.arguments.length > 0) {
      args.push(...context.arguments);
    }

    const child = spawn(context.executablePath, args, {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(context.executablePath),
    });

    child.unref();

    return {
      success: true,
      pid: child.pid,
      sessionRestored,
      autoLoginTriggered,
      requiresManualLogin,
      message,
    };
  }
}
