import { ipcRenderer } from 'electron';
import {
  QuickswapAPI,
  AccountHubAPI,
  Application,
  RegisterApplicationInput,
  UpdateApplicationInput,
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilter,
  SecurityStatus,
  VaultLockStatus,
  StoredCredentialMetadata,
  ActivityLogEntry,
  AppSettings,
  UpdateSettingsInput,
  LaunchResult,
  ProcessStatus,
  LaunchHistoryEntry,
  DashboardSummary,
  UpdateStatusData,
  IPC_CHANNELS,
} from '@quickswap/shared';

export const quickswapAPI: QuickswapAPI = {
  applications: {
    list: (): Promise<Application[]> => ipcRenderer.invoke(IPC_CHANNELS.APPLICATIONS_LIST),
    detect: (): Promise<Application[]> => ipcRenderer.invoke(IPC_CHANNELS.APPLICATIONS_DETECT),
    register: (input: RegisterApplicationInput): Promise<Application> =>
      ipcRenderer.invoke(IPC_CHANNELS.APPLICATIONS_REGISTER, input),
    update: (id: string, input: UpdateApplicationInput): Promise<Application> =>
      ipcRenderer.invoke(IPC_CHANNELS.APPLICATIONS_UPDATE, id, input),
    remove: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.APPLICATIONS_REMOVE, id),
    getById: (id: string): Promise<Application | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.APPLICATIONS_GET_BY_ID, id),
  },

  accounts: {
    list: (filter?: AccountFilter): Promise<Account[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_LIST, filter),
    getById: (id: string): Promise<Account | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_GET_BY_ID, id),
    create: (input: CreateAccountInput): Promise<Account> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_CREATE, input),
    update: (id: string, input: UpdateAccountInput): Promise<Account> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_UPDATE, id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_DELETE, id),
    setDefault: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_SET_DEFAULT, id),
    toggleFavorite: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_TOGGLE_FAVORITE, id),
    copyPassword: (id: string): Promise<{ success: boolean; durationSeconds: number; username?: string; message?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_COPY_PASSWORD, id),
  },

  security: {
    getStatus: (): Promise<SecurityStatus> => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_STATUS),
    listStoredCredentials: (): Promise<StoredCredentialMetadata[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_LIST_CREDENTIALS),
    verifyIntegrity: (): Promise<{ valid: boolean; issues: string[] }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_VERIFY_INTEGRITY),
    getLockStatus: (): Promise<VaultLockStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_LOCK_STATUS),
    setMasterPassword: (password: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_SET_MASTER_PASSWORD, password),
    unlockVault: (password: string): Promise<{ success: boolean; message?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_UNLOCK_VAULT, password),
    lockVault: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_LOCK_VAULT),
    removeMasterPassword: (password: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_REMOVE_MASTER_PASSWORD, password),
    changeMasterPassword: (currentPassword: string, newPassword: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_CHANGE_MASTER_PASSWORD, currentPassword, newPassword),
    resetVault: (confirmation: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_RESET_VAULT, confirmation),
    verifyAuditLog: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_VERIFY_AUDIT_LOG),
    onLockStatusChange: (callback: (status: VaultLockStatus) => void): (() => void) => {
      const handler = (_event: any, status: VaultLockStatus) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.VAULT_LOCK_STATUS_CHANGED, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.VAULT_LOCK_STATUS_CHANGED, handler);
      };
    },
  },

  launcher: {
    launch: (accountId: string, force?: boolean): Promise<LaunchResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAUNCHER_LAUNCH, accountId, force),
    getStatus: (applicationId: string): Promise<ProcessStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAUNCHER_GET_STATUS, applicationId),
    getHistory: (limit?: number): Promise<LaunchHistoryEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAUNCHER_GET_HISTORY, limit),
    captureSession: (accountId: string): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAUNCHER_CAPTURE_SESSION, accountId),
    hasSession: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAUNCHER_HAS_SESSION, accountId),
    clearSession: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAUNCHER_CLEAR_SESSION, accountId),
    autoLogin: (accountId: string): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAUNCHER_AUTO_LOGIN, accountId),
  },

  activity: {
    list: (limit?: number): Promise<ActivityLogEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVITY_LIST, limit),
    clear: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITY_CLEAR),
  },

  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    update: (input: UpdateSettingsInput): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, input),
  },

  dashboard: {
    getSummary: (): Promise<DashboardSummary> => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_SUMMARY),
  },

  backup: {
    export: (passphrase: string, outputPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP_EXPORT, passphrase, outputPath),
    inspect: (passphrase: string, filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP_INSPECT, passphrase, filePath),
    restore: (passphrase: string, filePath: string, conflictStrategy?: 'overwrite' | 'skip' | 'keep_both') =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RESTORE, passphrase, filePath, conflictStrategy),
  },

  migration: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.LEGACY_MIGRATION_GET_STATUS),
    run: () => ipcRenderer.invoke(IPC_CHANNELS.LEGACY_MIGRATION_RUN),
    cleanup: () => ipcRenderer.invoke(IPC_CHANNELS.LEGACY_MIGRATION_CLEANUP),
  },

  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  },

  updater: {
    checkForUpdates: (): Promise<UpdateStatusData> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK_FOR_UPDATES),
    downloadUpdate: (): Promise<{ success: boolean; message?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD),
    installUpdate: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),
    getStatus: (): Promise<UpdateStatusData> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_GET_STATUS),
    onStatusChange: (callback: (status: UpdateStatusData) => void): (() => void) => {
      const handler = (_event: any, status: UpdateStatusData) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS_CHANGED, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATUS_CHANGED, handler);
      };
    },
  },

  shell: {
    openExternal: (url: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, url),
  },
};

export const accountHubAPI: AccountHubAPI = quickswapAPI;
