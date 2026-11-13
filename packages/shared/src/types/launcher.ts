export interface LaunchResult {
  success: boolean;
  pid?: number;
  message?: string;
  alreadyRunning?: boolean;
  copiedPassword?: boolean;
  sessionRestored?: boolean;
  requiresManualLogin?: boolean;
}

export interface ProcessStatus {
  isRunning: boolean;
  pid?: number;
  processName?: string;
}

export interface LaunchHistoryEntry {
  id: string;
  accountId: string;
  applicationId: string;
  status: 'success' | 'failed';
  errorMessage?: string | null;
  launchedAt: string;
  accountDisplayName?: string;
  applicationName?: string;
}
