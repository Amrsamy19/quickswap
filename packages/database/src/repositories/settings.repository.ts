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

  public static getRaw(key: string): string | null {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  public static setRaw(key: string, value: string): void {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, JSON.stringify(value));
  }

  public static getAllRaw(): Record<string, string> {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare('SELECT key, value FROM settings').all() as unknown as Array<{ key: string; value: string }>;
    const result: Record<string, string> = {};
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch {
        result[r.key] = r.value;
      }
    }
    return result;
  }

  public static removeRaw(key: string): void {
    const db = DatabaseConnection.getInstance();
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }
}
