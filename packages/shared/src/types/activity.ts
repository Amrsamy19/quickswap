export type ActivityAction =
  | 'account_created'
  | 'account_updated'
  | 'account_deleted'
  | 'application_registered'
  | 'application_updated'
  | 'application_removed'
  | 'application_launched'
  | 'credentials_saved'
  | 'credentials_cleared'
  | 'session_saved'
  | 'session_cleared'
  | 'session_captured'
  | 'session_restored'
  | 'security_event'
  | 'system_startup';

export type ActivityEntityType = 'account' | 'application' | 'security' | 'system';

export interface ActivityLogEntry {
  id: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string | null;
  title: string;
  details: string | null; // Strictly sanitized, never contains raw secrets
  prevHash?: string;
  entryHash?: string;
  createdAt: string;
}

export interface AuditLogVerificationResult {
  valid: boolean;
  totalChecked: number;
  brokenIndex?: number;
  brokenEntryId?: string;
  message: string;
}
