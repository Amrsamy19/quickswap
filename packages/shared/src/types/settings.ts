export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  startWithWindows: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  lockOnMinimize?: boolean;
  autoLockMinutes: number;
  enableAuditLog: boolean;
  backupPath: string | null;
  databasePath: string;
  autoCheckUpdates?: boolean;
  autoDownloadUpdates?: boolean;
}

export type UpdateSettingsInput = Partial<AppSettings>;
