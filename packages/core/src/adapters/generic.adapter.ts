import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ApplicationAdapter, LaunchContext } from './base.adapter';
import { ApplicationCapabilities, LaunchResult } from '@quickswap/shared';
import { ProcessMonitor } from '../launcher/process-monitor';

export class GenericAdapter implements ApplicationAdapter {
  public readonly id = 'generic';
  public readonly name = 'Generic Launcher';

  public readonly capabilities: ApplicationCapabilities = {
    credentials: true,
    sessions: false,
    multipleInstances: true,
    accountIdentification: false,
    sessionValidation: false,
    manualLogin: true,
  };

  public async detectInstallation(): Promise<boolean> {
    return true;
  }

  public async getExecutablePath(): Promise<string | null> {
    return null;
  }

  public async getRunningStatus(executablePath: string): Promise<boolean> {
    const status = await ProcessMonitor.isRunning(executablePath);
    return status.isRunning;
  }

  public async launch(context: LaunchContext): Promise<LaunchResult> {
    const args = context.arguments || [];

    const child = spawn(context.executablePath, args, {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(context.executablePath),
    });

    child.unref();

    return {
      success: true,
      pid: child.pid,
      message: `Launched application for account "${context.displayName}"`,
    };
  }
}
