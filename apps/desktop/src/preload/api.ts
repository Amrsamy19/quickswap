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
  },

  security: {
    getStatus: (): Promise<SecurityStatus> => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_STATUS),
    listStoredCredentials: (): Promise<StoredCredentialMetadata[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_LIST_CREDENTIALS),
    verifyIntegrity: (): Promise<{ valid: boolean; issues: string[] }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY_VERIFY_INTEGRITY),
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
