import { ipcRenderer } from 'electron';
import {
  AccountHubAPI,
  Application,
  RegisterApplicationInput,
  UpdateApplicationInput,
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilter,
  SecurityStatus,
  StoredCredentialMetadata,
  ActivityLogEntry,
  AppSettings,
  UpdateSettingsInput,
  LaunchResult,
  ProcessStatus,
  LaunchHistoryEntry,
  IPC_CHANNELS,
} from '@accounthub/shared';

export const accountHubAPI: AccountHubAPI = {
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
};
