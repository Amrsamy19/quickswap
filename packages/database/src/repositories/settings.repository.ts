import { DatabaseConnection } from '../connection';
import { AppSettings } from '@quickswap/shared';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  startWithWindows: false,
  minimizeToTray: true,
  startMinimized: false,
  autoLockMinutes: 0,
  enableAuditLog: true,
  backupPath: null,
  databasePath: 'accounthub.db',
};

export class SettingsRepository {
  public static getSettings(): AppSettings {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare('SELECT key, value FROM settings').all() as unknown as Array<{ key: string; value: string }>;
    
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        (settings as any)[row.key] = JSON.parse(row.value);
      } catch {
        (settings as any)[row.key] = row.value;
      }
    }
    return settings;
  }

  public static updateSettings(updates: Partial<AppSettings>): AppSettings {
    const db = DatabaseConnection.getInstance();
    const insertStmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        insertStmt.run(key, JSON.stringify(value));
      }
    }

    return this.getSettings();
  }
}
