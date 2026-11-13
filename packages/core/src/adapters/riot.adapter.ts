import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ApplicationAdapter, LaunchContext } from './base.adapter';
import { ApplicationCapabilities, LaunchResult } from '@accounthub/shared';
import { ProcessMonitor } from '../launcher/process-monitor';

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
      message: `Launched Riot Client for account "${context.displayName}"`,
    };
  }
}
