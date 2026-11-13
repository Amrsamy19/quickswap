export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  startWithWindows: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  autoLockMinutes: number;
  enableAuditLog: boolean;
  backupPath: string | null;
  databasePath: string;
}

export type UpdateSettingsInput = Partial<AppSettings>;
