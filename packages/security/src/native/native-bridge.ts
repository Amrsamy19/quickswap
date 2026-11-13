import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AppError } from '@accounthub/shared';

export interface NativeHelperStatus {
  windowsCredManager: boolean;
  dpapi: boolean;
}

export class NativeBridge {
  private static binaryPath: string | null = null;

  public static getBinaryPath(): string {
    if (this.binaryPath && fs.existsSync(this.binaryPath)) {
      return this.binaryPath;
    }

    // Try several search locations
    const candidates = [
      path.resolve(__dirname, '../../bin/AccountHubSecHelper.exe'),
      path.resolve(__dirname, '../bin/AccountHubSecHelper.exe'),
      path.resolve(__dirname, '../../../packages/security/bin/AccountHubSecHelper.exe'),
      path.resolve(__dirname, '../../../../packages/security/bin/AccountHubSecHelper.exe'),
      path.resolve(process.cwd(), 'packages/security/bin/AccountHubSecHelper.exe'),
      path.resolve(process.cwd(), 'resources/bin/AccountHubSecHelper.exe'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        this.binaryPath = cand;
        return cand;
      }
    }

    throw new AppError(
      'SECURITY_VAULT_ERROR',
      'AccountHubSecHelper.exe was not found. Please run pnpm compile:sec or build the project.'
    );
  }

  public static async execute(command: string, args: string[] = [], stdinData?: string): Promise<any> {
    const exe = this.getBinaryPath();

    return new Promise((resolve, reject) => {
      const child = spawn(exe, [command, ...args], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', (err: Error) => {
        reject(new AppError('SECURITY_VAULT_ERROR', `Failed to execute security helper: ${err.message}`, err));
      });

      child.on('close', (code: number | null) => {
        if (code !== 0 && !stdout.trim()) {
          reject(new AppError('SECURITY_VAULT_ERROR', `Security helper exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.error) {
            reject(new AppError('SECURITY_VAULT_ERROR', parsed.error));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(new AppError('SECURITY_VAULT_ERROR', `Invalid JSON response from security helper: ${stdout}`));
        }
      });

      if (stdinData) {
        child.stdin.write(stdinData, 'utf8');
      }
      child.stdin.end();
    });
  }
}
