import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AppError } from '@quickswap/shared';

export interface NativeHelperStatus {
  windowsCredManager: boolean;
  dpapi: boolean;
}

export interface INativeBridge {
  execute(command: string, args?: string[], stdinData?: string): Promise<any>;
}

export class WindowsNativeBridge implements INativeBridge {
  private binaryPath: string | null = null;
  private daemonProcess: ChildProcess | null = null;
  private daemonReady: boolean = false;
  private stdoutBuffer: string = '';
  private pendingRequests = new Map<
    string,
    { resolve: (res: any) => void; reject: (err: any) => void; timeoutTimer: NodeJS.Timeout }
  >();
  private reqCounter: number = 0;

  public getBinaryPath(): string {
    if (this.binaryPath && fs.existsSync(this.binaryPath)) {
      return this.binaryPath;
    }

    const resourcesPath = (process as any).resourcesPath;
    const candidates = [
      ...(resourcesPath ? [
        path.resolve(resourcesPath, 'bin/QuickswapSecHelper.exe'),
        path.resolve(resourcesPath, 'bin/AccountHubSecHelper.exe')
      ] : []),
      path.resolve(__dirname, '../../bin/QuickswapSecHelper.exe'),
      path.resolve(__dirname, '../../bin/AccountHubSecHelper.exe'),
      path.resolve(__dirname, '../bin/QuickswapSecHelper.exe'),
      path.resolve(__dirname, '../bin/AccountHubSecHelper.exe'),
      path.resolve(__dirname, '../../../packages/security/bin/QuickswapSecHelper.exe'),
      path.resolve(__dirname, '../../../packages/security/bin/AccountHubSecHelper.exe'),
      path.resolve(__dirname, '../../../../packages/security/bin/QuickswapSecHelper.exe'),
      path.resolve(__dirname, '../../../../packages/security/bin/AccountHubSecHelper.exe'),
      path.resolve(process.cwd(), 'packages/security/bin/QuickswapSecHelper.exe'),
      path.resolve(process.cwd(), 'packages/security/bin/AccountHubSecHelper.exe'),
      path.resolve(process.cwd(), 'resources/bin/QuickswapSecHelper.exe'),
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
      'QuickswapSecHelper.exe was not found. Please run pnpm compile:sec or build the project.'
    );
  }

  private startDaemon(): void {
    if (this.daemonProcess) return;

    try {
      const exe = this.getBinaryPath();
      this.daemonProcess = spawn(exe, ['daemon'], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.stdoutBuffer = '';

      this.daemonProcess.stdout?.on('data', (chunk: Buffer) => {
        this.stdoutBuffer += chunk.toString('utf8');
        const lines = this.stdoutBuffer.split('\n');
        // Keep incomplete trailing segment in buffer
        this.stdoutBuffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          try {
            const parsed = JSON.parse(line);
            if (parsed.status === 'daemon_ready') {
              this.daemonReady = true;
              continue;
            }

            if (parsed.id && this.pendingRequests.has(parsed.id)) {
              const pending = this.pendingRequests.get(parsed.id)!;
              this.pendingRequests.delete(parsed.id);
              clearTimeout(pending.timeoutTimer);

              if (parsed.error) {
                pending.reject(new AppError('SECURITY_VAULT_ERROR', parsed.error));
              } else if (parsed.response && parsed.response.error) {
                pending.reject(new AppError('SECURITY_VAULT_ERROR', parsed.response.error));
              } else {
                pending.resolve(parsed.response !== undefined ? parsed.response : parsed);
              }
            }
          } catch {
            // Non-JSON or debug log line, ignore
          }
        }
      });

      this.daemonProcess.on('error', () => {
        this.cleanupDaemon();
      });

      this.daemonProcess.on('close', () => {
        this.cleanupDaemon();
      });
    } catch {
      this.cleanupDaemon();
    }
  }

  private cleanupDaemon(): void {
    if (this.daemonProcess) {
      try {
        this.daemonProcess.kill();
      } catch {}
      this.daemonProcess = null;
    }
    this.daemonReady = false;

    // Reject all pending requests with fallback notification
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timeoutTimer);
      req.reject(new AppError('SECURITY_VAULT_ERROR', 'Security helper daemon exited unexpectedly'));
    }
    this.pendingRequests.clear();
  }

  public async execute(command: string, args: string[] = [], stdinData?: string): Promise<any> {
    // If autologin-window (which interacts with UI Windows and sleeps for GUI elements), run one-shot
    if (command === 'autologin-window') {
      return this.executeOneShot(command, args, stdinData);
    }

    try {
      this.startDaemon();
      if (this.daemonProcess && this.daemonProcess.stdin) {
        return await this.executeViaDaemon(command, args, stdinData);
      }
    } catch {
      // Fallback to one-shot process spawn if daemon fails
    }

    return this.executeOneShot(command, args, stdinData);
  }

  private executeViaDaemon(command: string, args: string[], stdinData?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `req_${++this.reqCounter}_${Date.now()}`;
      const payload = JSON.stringify({
        id,
        command,
        args,
        data: stdinData || null,
      });

      const timeoutTimer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          // Fall back to one-shot execution on timeout
          this.executeOneShot(command, args, stdinData).then(resolve, reject);
        }
      }, 5000);

      this.pendingRequests.set(id, { resolve, reject, timeoutTimer });

      try {
        this.daemonProcess!.stdin!.write(payload + '\n');
      } catch (err: any) {
        this.pendingRequests.delete(id);
        clearTimeout(timeoutTimer);
        this.executeOneShot(command, args, stdinData).then(resolve, reject);
      }
    });
  }

  public async executeOneShot(command: string, args: string[] = [], stdinData?: string): Promise<any> {
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

/**
 * In-memory Mock Native Bridge allowing automated testing across all operating systems
 * and CI environments without executing Windows binaries.
 */
export class MockNativeBridge implements INativeBridge {
  private credentials = new Map<string, { target: string; username: string; password?: string }>();

  public async execute(command: string, args: string[] = [], stdinData?: string): Promise<any> {
    const cmd = command.toLowerCase();

    switch (cmd) {
      case 'status':
        return { windowsCredManager: true, dpapi: true };

      case 'dpapi-protect': {
        const plain = stdinData || (args.length > 0 ? args[0] : '');
        const encoded = Buffer.from(`mock_dpapi_${plain}`).toString('base64');
        return { success: true, data: encoded };
      }

      case 'dpapi-unprotect': {
        const base64 = stdinData || (args.length > 0 ? args[0] : '');
        try {
          const decoded = Buffer.from(base64, 'base64').toString('utf8');
          const plain = decoded.replace(/^mock_dpapi_/, '');
          return { success: true, data: plain };
        } catch {
          return { error: 'Failed to unprotect mock DPAPI' };
        }
      }

      case 'cred-write': {
        const target = args[0] || '';
        const username = args[1] || '';
        const password = stdinData || (args.length > 2 ? args[2] : '');
        this.credentials.set(target, { target, username, password });
        return { success: true, target };
      }

      case 'cred-read': {
        const target = args[0] || '';
        const cred = this.credentials.get(target);
        if (cred) {
          return {
            success: true,
            found: true,
            target: cred.target,
            username: cred.username,
            password: cred.password || '',
          };
        }
        return { success: true, found: false, target };
      }

      case 'cred-delete': {
        const target = args[0] || '';
        this.credentials.delete(target);
        return { success: true, target };
      }

      case 'cred-list': {
        const prefix = (args[0] || '').toLowerCase();
        const results = Array.from(this.credentials.values())
          .filter((c) => c.target.toLowerCase().startsWith(prefix))
          .map((c) => ({ target: c.target, username: c.username }));
        return { credentials: results };
      }

      case 'autologin-window': {
        return { success: true, message: 'Mock auto-login succeeded' };
      }

      default:
        throw new AppError('SECURITY_VAULT_ERROR', `Unknown mock command: ${command}`);
    }
  }

  public clear(): void {
    this.credentials.clear();
  }
}

export class NativeBridge {
  private static activeBridge: INativeBridge = new WindowsNativeBridge();

  public static setBridge(bridge: INativeBridge): void {
    this.activeBridge = bridge;
  }

  public static getBridge(): INativeBridge {
    return this.activeBridge;
  }

  public static async execute(command: string, args: string[] = [], stdinData?: string): Promise<any> {
    return this.activeBridge.execute(command, args, stdinData);
  }
}
