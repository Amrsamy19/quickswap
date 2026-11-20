import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ApplicationAdapter, LaunchContext } from './base.adapter';
import { ApplicationCapabilities, LaunchResult } from '@quickswap/shared';
import { ProcessMonitor } from '../launcher/process-monitor';

export class SteamAdapter implements ApplicationAdapter {
  public readonly id = 'steam';
  public readonly name = 'Steam';

  public readonly capabilities: ApplicationCapabilities = {
    credentials: true,
    sessions: true,
    multipleInstances: false,
    accountIdentification: true,
    sessionValidation: false,
    manualLogin: true,
  };

  public async detectInstallation(): Promise<boolean> {
    const p = await this.getExecutablePath();
    return Boolean(p && fs.existsSync(p));
  }

  public async getExecutablePath(): Promise<string | null> {
    const defaultPaths = [
      'C:\\Program Files (x86)\\Steam\\steam.exe',
      'C:\\Program Files\\Steam\\steam.exe',
      'D:\\Steam\\steam.exe',
      'E:\\Steam\\steam.exe',
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

    if (context.username && context.username.trim()) {
      args.push('-login', context.username.trim());
    }

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
      message: `Launched Steam with account "${context.displayName}"`,
    };
  }
}
