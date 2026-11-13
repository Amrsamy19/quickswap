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
  AuthMethod,
  AuthState,
} from './account';
import { AppSettings, UpdateSettingsInput } from './settings';
import { ActivityLogEntry } from './activity';
import { StoredCredentialMetadata } from './secret';
import { LaunchResult, ProcessStatus, LaunchHistoryEntry } from './launcher';

export interface SecurityStatus {
  windowsCredManagerAvailable: boolean;
  dpapiAvailable: boolean;
  activeSecretReferences: number;
  totalAccountsWithSecrets: number;
  securityHealth: 'healthy' | 'degraded' | 'error';
  lastSecurityCheck: string;
}

export interface AccountHubAPI {
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
  };

  launcher: {
    launch(accountId: string, force?: boolean): Promise<LaunchResult>;
    getStatus(applicationId: string): Promise<ProcessStatus>;
    getHistory(limit?: number): Promise<LaunchHistoryEntry[]>;
    captureSession(accountId: string): Promise<{ success: boolean; message: string }>;
    hasSession(accountId: string): Promise<boolean>;
    clearSession(accountId: string): Promise<void>;
  };

  activity: {
    list(limit?: number): Promise<ActivityLogEntry[]>;
    clear(): Promise<void>;
  };

  settings: {
    get(): Promise<AppSettings>;
    update(input: UpdateSettingsInput): Promise<AppSettings>;
  };
}
