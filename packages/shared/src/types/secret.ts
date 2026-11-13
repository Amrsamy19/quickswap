export type SecretType = 'password' | 'session_token' | 'refresh_token' | 'encryption_key';

export interface SecretReference {
  id: string;
  accountId: string;
  secretType: SecretType;
  credentialRef: string; // Target reference in Windows Credential Manager or DPAPI vault
  createdAt: string;
  updatedAt: string;
}

export interface StoredCredentialMetadata {
  accountId: string;
  targetName: string;
  username: string;
  hasPassword: boolean;
  lastUpdated: string;
}
