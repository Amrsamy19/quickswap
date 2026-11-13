import fs from 'fs';
import path from 'path';

export interface DetectedAppInfo {
  id: string;
  name: string;
  adapterId: string;
  executablePath: string;
  installPath: string;
  category: 'games' | 'communication' | 'productivity' | 'utilities';
}

export class ApplicationDetector {
  /**
   * Scans the system for known application installations.
   */
  public static async scanInstalledApplications(): Promise<DetectedAppInfo[]> {
    const results: DetectedAppInfo[] = [];

    // 1. Detect Riot Client
    const riot = this.detectRiotClient();
    if (riot) results.push(riot);

    // 2. Detect Steam
    const steam = this.detectSteam();
    if (steam) results.push(steam);

    // 3. Detect Epic Games
    const epic = this.detectEpicGames();
    if (epic) results.push(epic);

    // 4. Detect Discord
    const discord = this.detectDiscord();
    if (discord) results.push(discord);

    return results;
  }

  private static detectRiotClient(): DetectedAppInfo | null {
    // Check official RiotClientInstalls.json first
    const trackerPath = 'C:\\ProgramData\\Riot Games\\RiotClientInstalls.json';
    if (fs.existsSync(trackerPath)) {
      try {
        const raw = fs.readFileSync(trackerPath, 'utf8');
        const parsed = JSON.parse(raw);
        const exePath = parsed.rc_live || parsed.rc_default || parsed.rc_beta;
        if (exePath && fs.existsSync(exePath)) {
          return {
            id: 'riot-games',
            name: 'Riot Games',
            adapterId: 'riot',
            executablePath: exePath,
            installPath: path.dirname(exePath),
            category: 'games',
          };
        }
      } catch {
        // Fallback to standard paths
      }
    }

    const commonPaths = [
      'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
      'D:\\Riot Games\\Riot Client\\RiotClientServices.exe',
      'E:\\Riot Games\\Riot Client\\RiotClientServices.exe',
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return {
          id: 'riot-games',
          name: 'Riot Games',
          adapterId: 'riot',
          executablePath: p,
          installPath: path.dirname(p),
          category: 'games',
        };
      }
    }

    return null;
  }

  private static detectSteam(): DetectedAppInfo | null {
    const commonPaths = [
      'C:\\Program Files (x86)\\Steam\\steam.exe',
      'C:\\Program Files\\Steam\\steam.exe',
      'D:\\Steam\\steam.exe',
      'E:\\Steam\\steam.exe',
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return {
          id: 'steam',
          name: 'Steam',
          adapterId: 'steam',
          executablePath: p,
          installPath: path.dirname(p),
          category: 'games',
        };
      }
    }
    return null;
  }

  private static detectEpicGames(): DetectedAppInfo | null {
    const commonPaths = [
      'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
      'C:\\Program Files\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return {
          id: 'epic-games',
          name: 'Epic Games',
          adapterId: 'epic',
          executablePath: p,
          installPath: path.dirname(path.dirname(p)),
          category: 'games',
        };
      }
    }
    return null;
  }

  private static detectDiscord(): DetectedAppInfo | null {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const p = path.join(localAppData, 'Discord', 'Update.exe');
      if (fs.existsSync(p)) {
        return {
          id: 'discord',
          name: 'Discord',
          adapterId: 'discord',
          executablePath: p,
          installPath: path.dirname(p),
          category: 'communication',
        };
      }
    }
    return null;
  }
}
