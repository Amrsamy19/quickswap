export type AuthMethod = 'credentials' | 'session' | 'hybrid' | 'manual';

export type SessionStatus = 'valid' | 'expired' | 'missing' | 'unknown';

export type AuthState =
  | 'not_configured'
  | 'credentials_saved'
  | 'login_required'
  | 'authentication_pending'
  | 'session_available'
  | 'session_expired'
  | 'authentication_failed'
  | 'unknown';

export interface Account {
  id: string;
  applicationId: string;
  displayName: string;
  username: string | null;
  externalId: string | null;
  region: string | null;
  avatar: string | null;
  authMethod: AuthMethod;
  isFavorite: boolean;
  isDefault: boolean;
  launchArguments: string | null;
  authState: AuthState;
  hasCredentials: boolean;
  hasSession: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateAccountInput {
  applicationId: string;
  displayName: string;
  username?: string | null;
  password?: string | null; // Handled securely, stripped before DB persistence
  region?: string | null;
  avatar?: string | null;
  authMethod?: AuthMethod;
  isFavorite?: boolean;
  isDefault?: boolean;
  launchArguments?: string | null;
}

export interface UpdateAccountInput {
  displayName?: string;
  username?: string | null;
  password?: string | null; // If updating credentials
  region?: string | null;
  avatar?: string | null;
  authMethod?: AuthMethod;
  isFavorite?: boolean;
  isDefault?: boolean;
  launchArguments?: string | null;
}

export interface AccountFilter {
  applicationId?: string;
  query?: string;
  favoritesOnly?: boolean;
  authMethod?: AuthMethod;
}
