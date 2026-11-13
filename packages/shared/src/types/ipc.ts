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
  };

  security: {
    getStatus(): Promise<SecurityStatus>;
    listStoredCredentials(): Promise<StoredCredentialMetadata[]>;
    verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }>;
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
