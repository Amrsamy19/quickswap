import { execFile } from 'child_process';
import path from 'path';
import { ProcessStatus } from '@accounthub/shared';

export class ProcessMonitor {
  /**
   * Checks if an executable is currently running by its executable path or file name.
   */
  public static async isRunning(executablePath: string): Promise<ProcessStatus> {
    const imageName = path.basename(executablePath);

    return new Promise((resolve) => {
      // Use Windows tasklist
      execFile(
        'tasklist.exe',
        ['/FO', 'CSV', '/NH', '/FI', `IMAGENAME eq ${imageName}`],
        { windowsHide: true },
        (error, stdout) => {
          if (error || !stdout) {
            resolve({ isRunning: false, processName: imageName });
            return;
          }

          const trimmed = stdout.trim();
          // "INFO: No tasks are running which match the specified criteria."
          if (
            trimmed.includes('No tasks are running') ||
            !trimmed.toLowerCase().includes(imageName.toLowerCase())
          ) {
            resolve({ isRunning: false, processName: imageName });
            return;
          }

          // Parse PID from CSV output: "Image Name","PID","Session Name","Session#","Mem Usage"
          const match = trimmed.match(/"([^"]+)","(\d+)"/);
          const pid = match && match[2] ? parseInt(match[2], 10) : undefined;

          resolve({
            isRunning: true,
            pid,
            processName: imageName,
          });
        }
      );
    });
  }

  /**
   * Gracefully or forcefully terminates a process by executable name or PID.
   */
  public static async killProcess(imageNameOrPid: string | number): Promise<boolean> {
    return new Promise((resolve) => {
      const args =
        typeof imageNameOrPid === 'number'
          ? ['/F', '/PID', imageNameOrPid.toString()]
          : ['/F', '/IM', path.basename(imageNameOrPid)];

      execFile('taskkill.exe', args, { windowsHide: true }, (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * Safely terminates any active Riot Client processes to allow swapping session files without file lock conflicts.
   */
  public static async killRiotClient(): Promise<boolean> {
    await this.killProcess('RiotClientServices.exe');
    await this.killProcess('RiotClientUx.exe');
    // Short wait to ensure file handles are released
    await new Promise((r) => setTimeout(r, 600));
    return true;
  }
}
