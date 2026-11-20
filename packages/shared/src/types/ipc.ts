import {
  Application,
  RegisterApplicationInput,
  UpdateApplicationInput,
} from './application';
import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilter,
} from './account';
import { AppSettings, UpdateSettingsInput } from './settings';
import { ActivityLogEntry, AuditLogVerificationResult } from './activity';
import { StoredCredentialMetadata } from './secret';
import { LaunchResult, ProcessStatus, LaunchHistoryEntry } from './launcher';

export interface DashboardSummary {
  applications: Application[];
  accounts: Account[];
  securityStatus: SecurityStatus;
  credentials: StoredCredentialMetadata[];
  activities: ActivityLogEntry[];
  settings: AppSettings;
}

export interface SecurityStatus {
  windowsCredManagerAvailable: boolean;
  dpapiAvailable: boolean;
  activeSecretReferences: number;
  totalAccountsWithSecrets: number;
  securityHealth: 'healthy' | 'degraded' | 'error';
  lastSecurityCheck: string;
}

export interface VaultLockStatus {
  isLocked: boolean;
  hasMasterPassword: boolean;
  failedAttempts: number;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  autoLockMinutes: number;
}

export interface BackupPreviewData {
  valid: boolean;
  version: number;
  exportedAt: string;
  accountsCount: number;
  applicationsCount: number;
  accounts: Array<{ id: string; displayName: string; username?: string | null; appName: string }>;
  applications: Array<{ id: string; name: string }>;
}

export interface RestoreResultData {
  success: boolean;
  accountsRestored: number;
  applicationsRestored: number;
  message: string;
}

export interface LegacyMigrationStatusData {
  legacyFolderFound: boolean;
  legacyFolderPath: string | null;
  legacyDbFound: boolean;
  legacyCredentialCount: number;
  migrationCompleted: boolean;
  migrationDate: string | null;
}

export interface UpdateProgressData {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'dev-mode';

export interface UpdateStatusData {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion?: string;
  releaseDate?: string;
  releaseNotes?: string;
  progress?: UpdateProgressData;
  error?: string;
  isPortable?: boolean;
}

export interface QuickswapAPI {
  applications: {
    list(): Promise<Application[]>;
    detect(): Promise<Application[]>;
    register(input: RegisterApplicationInput): Promise<Application>;
    update(id: string, input: UpdateApplicationInput): Promise<Application>;
    remove(id: string): Promise<void>;
    getById(id: string): Promise<Application | null>;
  };

  accounts: {
    list(filter?: AccountFilter): Promise<Account[]>;
    getById(id: string): Promise<Account | null>;
    create(input: CreateAccountInput): Promise<Account>;
    update(id: string, input: UpdateAccountInput): Promise<Account>;
    delete(id: string): Promise<void>;
    setDefault(id: string): Promise<void>;
    toggleFavorite(id: string): Promise<boolean>;
    copyPassword(accountId: string): Promise<{ success: boolean; durationSeconds: number; username?: string; message?: string }>;
  };

  security: {
    getStatus(): Promise<SecurityStatus>;
    listStoredCredentials(): Promise<StoredCredentialMetadata[]>;
    verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }>;
    getLockStatus(): Promise<VaultLockStatus>;
    setMasterPassword(password: string): Promise<{ success: boolean }>;
    unlockVault(password: string): Promise<{ success: boolean; message?: string }>;
    lockVault(): Promise<{ success: boolean }>;
    removeMasterPassword(currentPassword: string): Promise<{ success: boolean }>;
    changeMasterPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }>;
    resetVault(confirmation: string): Promise<{ success: boolean }>;
    verifyAuditLog(): Promise<AuditLogVerificationResult>;
    onLockStatusChange(callback: (status: VaultLockStatus) => void): () => void;
  };

  launcher: {
    launch(accountId: string, force?: boolean): Promise<LaunchResult>;
    getStatus(applicationId: string): Promise<ProcessStatus>;
    getHistory(limit?: number): Promise<LaunchHistoryEntry[]>;
    captureSession(accountId: string): Promise<{ success: boolean; message: string }>;
    hasSession(accountId: string): Promise<boolean>;
    clearSession(accountId: string): Promise<void>;
    autoLogin(accountId: string): Promise<{ success: boolean; message: string }>;
  };

  activity: {
    list(limit?: number): Promise<ActivityLogEntry[]>;
    clear(): Promise<void>;
  };

  settings: {
    get(): Promise<AppSettings>;
    update(input: UpdateSettingsInput): Promise<AppSettings>;
  };

  dashboard: {
    getSummary(): Promise<DashboardSummary>;
  };

  backup: {
    export(passphrase: string, outputPath: string): Promise<{ success: boolean; filePath: string; accountsCount: number }>;
    inspect(passphrase: string, filePath: string): Promise<BackupPreviewData>;
    restore(passphrase: string, filePath: string, conflictStrategy?: 'overwrite' | 'skip' | 'keep_both'): Promise<RestoreResultData>;
  };

  migration: {
    getStatus(): Promise<LegacyMigrationStatusData>;
    run(): Promise<{ migratedDatabase: boolean; migratedCredentials: number; message: string }>;
    cleanup(): Promise<{ cleanedCredentials: number; cleanedFolder: boolean; message: string }>;
  };

  window: {
    minimize(): Promise<void>;
    maximize(): Promise<boolean>;
    close(): Promise<void>;
    isMaximized(): Promise<boolean>;
  };

  updater: {
    checkForUpdates(): Promise<UpdateStatusData>;
    downloadUpdate(): Promise<{ success: boolean; message?: string }>;
    installUpdate(): Promise<void>;
    getStatus(): Promise<UpdateStatusData>;
    onStatusChange(callback: (status: UpdateStatusData) => void): () => void;
  };

  shell: {
    openExternal(url: string): Promise<boolean>;
  };
}

export type AccountHubAPI = QuickswapAPI;
